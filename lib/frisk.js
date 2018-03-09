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
    if (_.isString(value)) {
        try {
            value = JSON.parse(value);
        }
        catch(err) {
            return false;
        }
    }
    return _.isPlainObject(value);
};

const confirmType = (type, value) => {
    if(type === Frisk.types.integer) {
        return _.isInteger(_.toInteger(value));
    } else if (type === Frisk.types.number) {
        return _.isNumber(_.toNumber(value));
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

// Returns an array [in, value] where in is either body,query,params, or '',
//  and value is the parameter found at that location
const getValueInLocation = (schemaField, schemaKey, req, mergedReq)  => {
    if (_.isUndefined(schemaField.in)) {
        return ['', mergedReq[schemaKey]];
    } else if (_.includes(requestParameterLocations, schemaField.in)) {
        return [schemaField.in, _.get(req, [schemaField.in, schemaKey])];
    }
    // We validate the schema for valid in parameter earlier - so this shouldn't run
    throw new Error('Unexpected \'in\' parameter in schema')
};

// combines a key with a prefix, separated by a dot
const getFullKey = (prefix, key) => {
    if (!_.isEmpty(prefix)) {
        return _.join([prefix, key], '.');
    }
    return key;
};

// generateError takes a key and returns an error object
const strictCheck = (object, schema, generateError) => {
    return _.difference(_.keys(object), _.keys(schema))
        .map((extraneousReqKey) => {
            return generateError(extraneousReqKey);
        });
};

/**
* validates request parameters against a schema.  Returns an array of validation error strings
* @method validate
* @param {Object} schema    - schema to validate the request against
* @param {Object} req       - The request object with properties 'body', 'params', and 'query'
* @param {Object} mergedReq - request to validate against the schema
* @param {boolean} strict   - strict mode option.  In strict mode a request is rejected if it contains items that aren't
*                             explicitly listed in the schema.
* @param {boolean} usesIn   - True if the schema uses the 'in' property to specify location of the parameters
*/
const validate = (schema, req, mergedReq, strict, usesIn) => {

    let errors = _.reduce(schema, (errors, schemaField, schemaKey) => {
        const [location, value] = getValueInLocation(schemaField, schemaKey, req, mergedReq);
        const fullKey = getFullKey(location, schemaKey);
        return _.concat(errors, validateProperty(fullKey, value, schemaField, strict))
    }, []);


    if (strict) {
        let strictErrors;
        if (!usesIn) {
            strictErrors = strictCheck(mergedReq, schema, (key) => {
                return {
                    name: key,
                    error: `${key} is not an allowed field`,
                }
            })
        } else {
            // If we use in, we determine strictness by each 'body', 'query', 'params'
            strictErrors = requestParameterLocations.reduce((errors, paramLocation) => {
                const relevantSchema = _.pickBy(schema, (schemaValue) => {
                    return schemaValue.in === paramLocation;
                });
                return strictCheck(req[paramLocation], relevantSchema, (key) => {
                    return {
                        name: key,
                        error: `${key} is not allowed in the ${paramLocation}`,
                    }
                })
            }, [])
        }
        errors = _.concat(errors, strictErrors);
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
            return recursivelyValidateObjectField(subSchema, value, fullKey, strict);
        }
    } else if (schemaField.required) {
        return {
            name: fullKey,
            error: `${fullKey} is a required field`,
        };
    }
    return [];
};

const recursivelyValidateObjectField = (schema, objectToValidate, prefix, strict) => {
    if (_.isString(objectToValidate)) {
        try {
            objectToValidate = JSON.parse(objectToValidate);
        } catch (err) {
            return {
                name: prefix,
                error: `${prefix} must be of type object`,
            };
        }
    }

    let errors = _.reduce(schema, (errors, schemaField, schemaKey) => {
        const value = objectToValidate[schemaKey];
        const fullKey = getFullKey(prefix, schemaKey);
        return _.concat(errors, validateProperty(fullKey, value, schemaField, strict));
    }, []);

    if (strict) {
        const strictErrors = strictCheck(objectToValidate, schema, (key) => {
            const fullKey = getFullKey(prefix, key);
            return {
                name: fullKey,
                error: `${fullKey} is not an allowed field`,
            }
        });
        errors = _.concat(errors, strictErrors);
    }
    return errors;
};

// Validate the given schema so that we can fail early - before the route is actually hit
const validateGivenSchema = (schema, usesIn) => {

    if (!_.isObject(schema)) {
        throw new Error('validateRequest requires an Object');
    }

    // If one property of the schema uses in, all must
    if (usesIn) {
        _.forEach(schema, (schemaField, schemaKey) => {
            // We accept 'path' as an alias for 'param'
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
            const mergedReqParams = _.merge(req.body, req.query, req.params);
            const reqParams = _.pick(req, requestParameterLocations);
            const errors = validate(schema, reqParams, mergedReqParams, strict, usesIn);

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
