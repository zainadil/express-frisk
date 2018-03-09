'use strict';
const _ = require('lodash');
const validateUUID = require('uuid-validate');

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


// combines a key with a prefix, separated by a dot
const getFullKey = (prefix, key) => {
    if (!_.isEmpty(prefix)) {
        return _.join([prefix, key], '.');
    }
    return key;
};

/**
* validates request parameters against a schema.  Returns an array of validation error strings
* @method validate
* @param {Object} schema    - schema to validate the request against
* @param {Object} req       - The request object with properties 'body', 'params', and 'query'
* @param {Object} mergedReq - request to validate against the schema
* @param {boolean} strict   - strict mode option.  In strict mode a request is rejected if it contains items that aren't
*                             explicitly listed in the schema.
*/
const validate = (schema, req, mergedReq, strict) => {

    let errors = _.reduce(schema, (errors, schemaField, schemaKey) => {
        const value = mergedReq[schemaKey];
        return _.concat(errors, validateProperty(schemaKey, value, schemaField, strict))
    }, []);

    if (strict) {
        // in strict mode all request properties must be defined in the frisk schema, otherwise the request must be rejected
        //  Take difference between keys in the req and keys in the schema to get extraneousKeys
        const strictErrors = _.difference(_.keys(mergedReq), _.keys(schema))
            .map((extraneousReqKey) => {
                return {
                    name: extraneousReqKey,
                    error: `${extraneousReqKey} is not an allowed field`,
                }
            });
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
        // in strict mode all request properties must be defined in the frisk schema, otherwise the request must be rejected
        //  Take difference between keys in the req and keys in the schema to get extraneousKeys
        const strictErrors = _.difference(_.keys(objectToValidate), _.keys(schema))
            .map((extraneousReqKey) => {
                const fullKey = getFullKey(prefix, extraneousReqKey);
                return {
                    name: fullKey,
                    error: `${fullKey} is not an allowed field`,
                }
            });
        errors = _.concat(errors, strictErrors);
    }
    return errors;

};


const Frisk = {
    validateRequest: (schema, strict = false) => {
        if (!_.isObject(schema)) {
            throw new Error('Validate Request requires an Object');
        }
        return (req, res, next) => {
            const mergedReqParams = _.merge(req.body, req.query, req.params);
            const reqParams = _.pick(req, ['body', 'params', 'query']);
            const errors = validate(schema, reqParams, mergedReqParams, strict);

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
