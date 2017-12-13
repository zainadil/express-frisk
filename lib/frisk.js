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


// combines a key with a prefix, separated by dots
function getFullKey(prefix, key) {
    if (!_.isEmpty(prefix)) {
        return _.join([prefix, key], '.');
    }
    return key;
}


function validate(fields, reqParams, prefix, strict) {
    if (!_.isObject(fields)) {
        throw new Error('Validate Request requires an Object');
    }
    let errors = [];
    const keys = _.keys(fields);

    
    _.each(keys, (key) => {
        const field = fields[key];
        const value = reqParams[key]; 
        const fullKey = getFullKey(prefix, key);
        
        if (!_.isUndefined(value)) {
            validateType(errors, key, field.type, value, prefix);
            if (field.type == Frisk.types.object && _.isEmpty(errors) && field.properties) {
                
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
        const reqKeys = _.keys(reqParams);
        _.each(reqKeys, (reqKey) => {
            if (!_.has(fields, reqKey)) {
                const fullKey = getFullKey(prefix, reqKey);
                errors.push({
                    name: fullKey,
                    error: `${fullKey} is not an allowed field`,
                });
            }
        });
        // in strict mode all properties must be defined in the frisk schema, otherwise the request must be rejected

    }
    return errors;
}

const Frisk = {

    validateRequest: (fields, strict = false) => {
        return (req, res, next) => {

            // TODO verify that there are no unintended side effects of this merge
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

    types : {
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

