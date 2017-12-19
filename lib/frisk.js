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
    } else {
        return false
    };
};

const validateType = (errors, key, type, value, prefix) => {
    const fullKey = getFullKey(prefix, key);
    
    if (!confirmType(type, value)) {
        errors.push({
            name: fullKey,
            error: `${fullKey} must be of type ${_.findKey(Frisk.types, (value) => { return value === type; })}`,
        });
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
* @param {Object} reqParams - request parameters to validate against the schema
* @param {string} prefix    - when validating against sub properties of an object, properties should be the full path string 
*                             of the property.  When validating the top level of the schema, set this to an empty string
* @param {boolean} strict   - strict mode option.  In strict mode a request is rejected if it contains items that aren't 
*                             explicitly listed in the schema.
*/
const validate = (schema, reqParamsArg, prefix, strict) => {
    if (!_.isObject(schema)) {
        throw new Error('Validate Request requires an Object');
    }
    let errors = [];
    let reqParams = reqParamsArg;
    if (_.isString(reqParams)) {
        try {
            reqParams = JSON.parse(reqParams);
        } catch (err) {
            if (_.isEmpty(prefix)) {
                errors.push({
                    name: 'Parameters',
                    error: 'cannot be parsed',
                });
            } else {
                errors.push({
                    name: prefix,
                    error: `${prefix} must be of type object`,
                });
            }
            return errors;
        }
    }
   
    const keys = _.keys(schema);

    _.each(keys, (key) => {
        const field = schema[key];
        const value = reqParams[key]; 
        const fullKey = getFullKey(prefix, key);
        
        if (!_.isUndefined(value)) {
            validateType(errors, key, field.type, value, prefix);
            if (field.type == Frisk.types.object && field.properties) {
                
                // need to validate the properties of this object
                const subFields = field.properties;
                const subReq = reqParams[key];
                const subErrors = validate(subFields, subReq, fullKey, strict);
                
                if (!_.isEmpty(subErrors)) {
                    errors = _.concat(errors, subErrors);
                }
            }
        } else if (field.required) {
            errors.push({
                name: fullKey,
                error: `${fullKey} is a required field`,
            });
        }
    });
    if (strict) {

        // in strict mode all request properties must be defined in the frisk schema, otherwise the request must be rejected
        const reqKeys = _.keys(reqParams);
        if (_.isString(reqKeys)) {
            throw new Error('got a string');
        }
        _.each(reqKeys, (reqKey) => {
            if (!_.has(schema, reqKey)) {
                const fullKey = getFullKey(prefix, reqKey);
                errors.push({
                    name: fullKey,
                    error: `${fullKey} is not an allowed field`,
                });
            }
        });
    }
    return errors;
};

const Frisk = {
    validateRequest: (fields, strict = false) => {
        return (req, res, next) => {
            let mergedReqParams = _.merge(req.body, req.query); 
            mergedReqParams = _.merge(mergedReqParams, req.params);
            const errors = validate(fields, mergedReqParams, '', strict);

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
        ISOString: 7
    },
};

module.exports = Frisk;
