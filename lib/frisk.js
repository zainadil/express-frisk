'use strict';
const _ = require('lodash');
const validateUUID = require('uuid-validate');

const getValue = (req, key) => {
    return req.params[key] || req.query[key] || req.body[key];
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
    } else {
        return false;
    }
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

const Frisk = {

    validateRequest: (fields) => {
        return (req, res, next) => {
            if (!_.isObject(fields)) {
                throw new Error('Validate Request requires an Object');
            }
            const errors = [];
            const keys = _.keys(fields);
            _.each(keys, (key) => {
                const field = fields[key];
                const value = getValue(req, key);
                if (field.required) {
                    if (!value) {
                        errors.push({
                            name: key,
                            error: `${key} is a required field`,
                        });
                    } else {
                        validateType(errors, key, field.type, value);
                    }
                } else {
                    validateType(errors, key, field.type, value);
                }
            });

            if (!_.isEmpty(errors)) {
                returnError(res, errors);
            }
            // no problem!
            next();
        }
    },

    types : {
        integer: 0,
        number: 1,
        string: 2,
        uuid: 3,
    },
};

module.exports = Frisk;
