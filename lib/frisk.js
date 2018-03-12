'use strict';
const _ = require('lodash');
const validateUUID = require('uuid-validate');

const requestParameterLocations = ['body', 'params', 'query'];

const validateArray = (validator, array) => {
    return _.reduce(array, (isValid, element) => {
        return isValid && validator(element);
    }, true);
};

const isObject = (value) => {
    return _.isPlainObject(value);
};

const confirmType = (type, value) => {
    if(type === Frisk.types.integer) {
        return _.isInteger(_.toInteger(value));
    } else if (type === Frisk.types.number) {
        return _.isFinite(_.toNumber(value));
    } else if (type === Frisk.types.string) {
        return _.isString(value);
    } else if (type === Frisk.types.uuid) {
        return validateUUID(value);
    } else if (type === Frisk.types.object) {
        return isObject(value);
    } else if (type === Frisk.types.arrayOfStrings) {
        return validateArray(_.isString, value);
    } else if (type === Frisk.types.arrayOfUUID) {
        return validateArray(validateUUID, value);
    } else if (type === Frisk.types.ISOString) {
        return !_.isNaN(Date.parse(value));
    } else if (type === Frisk.types.boolean) {
        return _.isBoolean(value);
    } else {
        return false
    }
};

const validateType = (key, type, value) => {
    if (!confirmType(type, value)) {
        return {
            name: key,
            error: `${key} must be of type ${_.findKey(Frisk.types, (value) => { return value === type; })}`,
        };
    }
};

const returnError = (res, errors) => {
    res.status(400).send({
        message:  'Invalid Request',
        errors: errors
    });
};

// combines a key with a prefix, separated by a dot
const getFullKey = (prefix, key) => {
    if (!_.isEmpty(prefix)) {
        return _.join([prefix, key], '.');
    }
    return key;
};

const strictCheck = (object, schema, prefix) => {
    return _.difference(_.keys(object), _.keys(schema))
        .map((extraneousReqKey) => {
            const fullKey = getFullKey(prefix, extraneousReqKey);
            return {
                name: fullKey,
                error: `${fullKey} is not an allowed field`,
            }
        });
};

/**
* validates request parameters against a schema.  Returns an array of validation error strings
* @method validate
* @param {Object} schema    - schema to validate the request against
* @param {Object} objectToValidate       - The request object with properties 'body', 'params', and 'query'
* @param {boolean} strict   - strict mode option.  In strict mode a request is rejected if it contains items that aren't
*                             explicitly listed in the schema.
* @param {string} prefix    - Used for generating helpful error messages.  Keeps track of where in the whole object we are
*/

const validate = (schema, objectToValidate, prefix, strict) => {
    let errors = _.reduce(schema, (errors, schemaField, schemaKey) => {
        const value = _.get(objectToValidate, schemaKey);
        const fullKey = getFullKey(prefix, schemaKey);
        return _.concat(errors, validateProperty(fullKey, value, schemaField, strict));
    }, []);

    if (strict) {
        errors = _.concat(errors, strictCheck(objectToValidate, schema, prefix));
    }
    return errors;
};

const validateProperty = (fullKey, value, schemaField, strict) => {
    if (!_.isUndefined(value)) {
        const typeError = validateType(fullKey, schemaField.type, value);
        if (!_.isUndefined(typeError)) {
            return typeError;
        }
        if (schemaField.type === Frisk.types.object && schemaField.properties) {
            // need to validate the properties of this object
            const subSchema = schemaField.properties;
            return validate(subSchema, value, fullKey, strict);
        }
    } else if (schemaField.required) {
        return {
            name: fullKey,
            error: `${fullKey} is a required field`,
        };
    }
    return [];
};



// Validate the given schema so that we can fail early - before the route is actually hit
const validateGivenSchema = (schema, usesIn) => {

    if (!_.isObject(schema)) {
        throw new Error('validateRequest requires an Object');
    }

    if (usesIn) {
        _.forEach(schema, (schemaField, schemaKey) => {
            // We accept 'path' as an alias for 'params'
            if (schemaField.in === 'path') {
                schemaField.in = 'params';
            }
            const inValue = schemaField.in;

            if (!_.includes(requestParameterLocations, inValue)) {
                if (_.isNil(inValue)) {
                    throw new Error(`The \'in\' property of key '${schemaKey}' must be defined`);
                } else {
                    throw new Error(`Invalid value for the \'in\' property of key ${schemaKey}: ${inValue}. ` +
                        `Expected one of [${requestParameterLocations.join(', ')}]`
                    );
                }
            }
        })
    }
};

const Frisk = {
    validateRequest: (schema, strict = false) => {

        const usesIn = _.some(schema, (schemaField) => {
            return _.has(schemaField, 'in');
        });
        validateGivenSchema(schema, usesIn);

        return (req, res, next) => {
            let errors;

            if (usesIn) {
                errors = _.concat(
                    ..._.map(['body', 'query', 'params'], (paramLocation) => {
                        return validate(
                            _.pickBy(schema, ['in', paramLocation]),
                            req[paramLocation], paramLocation, strict
                        );
                    })
                );
            } else {
                const mergedReqParams = _.merge(req.body, req.query, req.params);
                errors = validate(schema, mergedReqParams, '', strict)
            }

            if (!_.isEmpty(errors)) {
                returnError(res, errors);
            } else {
                next();
            }
        };
    },

    types: {
        integer: 0,
        number: 1,
        string: 2,
        uuid: 3,
        object: 4,
        arrayOfStrings: 5,
        arrayOfUUID: 6,
        ISOString: 7,
        boolean: 8
    },
};

Object.freeze(Frisk.types);
module.exports = Frisk;
