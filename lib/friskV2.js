'use strict';

const validateUUID = require('uuid-validate');

const attemptToParseIntoJSON = (value) => {
    try {
        return JSON.parse(value)
    } catch (err) {
        return value;
    }
};

const isObject = (value) => {
    return _.isPlainObject(parseIntoObject(value));
};

// A type is a function that takes an input and a fullKey and either returns [] or an error object
const createType = (typeValidator, errorMessage) => {
    return (input, fullKey) => {
        if (typeValidator(input)) {
            // Passed validation
            return []
        } else {
            return {
                name: fullKey,
                error: `${fullKey} must be ${errorMessage}`
            }
        }
    }
};

const isValidFriskType = (proposedType) => {
    return _.includes(Frisk.types, proposedType)
};


const createValidator = (friskDefinition, key) => {
    ensureProperFriskDefinition(friskDefinition);

    const usesIn = _.has(friskDefinition, 'in');
    const { required, type } = friskDefinition;
    return (req, mergedReqParams) => {
        const objToLookInto = usesIn ? req[friskDefinition.in] : mergedReqParams;
        const value = attemptToParseIntoJSON(objToLookInto[key]);
        if (!_.isUndefined(value)) {
            return type(value, key)
        } else if (required) {
            return {
                name: key,
                error: `${key} is a required field`,
            }
        }
        return [];
    }
};

const ensureProperFriskDefinition = (friskParam) => {

};

const strictlyValidate = () => true;

const Frisk = {

    validateRequest: (fields, strict = false) => {

        // Each property of fields is something to validate on the request
        const validators = _.map(fields, createValidator);

        return (req, res, next) => {
            const mergedReqParams =  _.merge(req.body, req.query, req.params);

            let errors = _.reduce(validators, (errors, validator) => {
                return _.concat(errors, validator(req, mergedReqParams));
            }, []);

            if (_.isEmpty(errors) && strict === true) {
                errors = _.concat(errors, strictlyValidate(req))
            }

            if (!_.isEmpty(errors)) {
                res.status(400).send({
                    message:  'Invalid Request',
                    errors: errors
                });
            } else {
                next();
            }
        }
    },

    types: {
        integer: createType(
            'an integer',
            (value) => { return _.isInteger(_.toInteger(value))}),
        number: createType(
            'a number',
            (value) => { return _.isNumber(_.toNumber(value)) }),
        string: createType(
            'a string',
            (value) => { return _.isString(value) }),
        uuid: createType(
            'a uuid',
            (value) => { return validateUUID(value) }),
        object: createType(
            'an object',
            (value) => { return isObject(value) }),
        arrayOfStrings: createType(
            'an array of strings',
            (value) => { return _.isArray(value) && _.every(value, _.isString) }),
        arrayOfUUID: createType(
            'an array of uuids',
            (value) => { return _.isArray(value) && _.every(value, validateUUID) }),
        ISOString: createType(
            'an ISOString',
            (value) => { !_.isNaN(Date.parse(value)) }),
        boolean: createType(
            'a boolean',
            (value) =>  { return _.isBoolean(value) })
    }
};

// Safety
Object.freeze(Frisk.types);
module.exports = Frisk;