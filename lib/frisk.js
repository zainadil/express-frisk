'use strict';
const _ = require('lodash');
const validateUUID = require('uuid-validate');

/*const getValue = (req, key) => {
    
    return req.params[key] || req.query[key] || req.body[key];
};*/

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

const validateType = (errors, key, type, value) => {
    if(!confirmType(type, value)) {
        errors.push({
            name: key,
            error: `${key} must be of type ${_.findKey(Frisk.types, (value) => { return value === type; })}`,
        });
    }
};

const returnError = (res, errors) => {
    res.status(400).send({
        message:  'Invalid Request',
        errors: errors
    });
};


function validate(fields, reqParams, prefix) {
    if (!_.isObject(fields)) {
        throw new Error('Validate Request requires an Object');
    }
    let errors = [];
    const keys = _.keys(fields);

    
    _.each(keys, (key) => {
        const field = fields[key];
        const value = reqParams[key]; 
        let fullKey = key;
        if (!_.isEmpty(prefix)) {
            fullKey = _.join([prefix, key], '.');
        }
        if (!_.isUndefined(value)) {
            validateType(errors, key, field.type, value);
            if (field.type == Frisk.types.object && _.isEmpty(errors) && field.properties) {
                // need to validate the properties of this object
                const subFields = field.properties;
                const subReq = reqParams[key];
                
                const subErrors = validate(subFields, subReq, fullKey);
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
    return errors;
}

const Frisk = {

    validateRequest: (fields) => {
        return (req, res, next) => {
            let mergedReqParams = _.merge(req.params, req.query); // TODO verify that there are no unintended side effects of this merge
            mergedReqParams = _.merge(mergedReqParams, req.body);
            const errors = validate(fields, mergedReqParams);
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

