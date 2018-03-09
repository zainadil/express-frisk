'use strict';

const _ = require('lodash');
const chai = require('chai');
const should = chai.use(require('chai-as-promised')).should();
const sinon = require('sinon');

const Utils = require('./testing.utils.js');
const frisk = require('../lib/frisk');

const testSchemas = require('./schemas.js');

// re-usable test stubs
const Spies =  {
    
    // use this as next method if the desired test outcome for frisk middleware to accept
    nextAccept: sinon.spy(() => { Promise.resolve(); }),

    // use this as next method if the desired test outcome is for frisk middleware to reject the request
    nextReject: sinon.spy(() => { throw new Error('Next should not be called by this test'); })
};

describe('Express Frisk Middleware', () => {
    beforeEach('Reset Spies', () => {
        _.each(Spies, (spy) => {
            spy.reset();
        });
    });

    context('When the schema has an object at the top level', () => {
        it('Detects missing property', () => {
            const req = Utils.newRequest({});
            const res = Utils.newResponse((payload) => {
                payload.message.should.equal('Invalid Request');
                payload.errors[0].name.should.equal('someObject');
                payload.errors[0].error.should.equal('someObject is a required field');
            });
            frisk.validateRequest(testSchemas.objectSchema)(req,res,Spies.nextReject);
        });
        it('Validates that parameter is an object', () => {
            const req = Utils.newRequest({ someObject: 'not an object' });
            const res = Utils.newResponse((payload) => {
                payload.message.should.equal('Invalid Request');
                payload.errors[0].name.should.equal('someObject');
                payload.errors[0].error.should.equal('someObject must be of type object');
            });
            frisk.validateRequest(testSchemas.objectSchema)(req,res,Spies.nextReject);
        });
        it('Accepts matching property', () => {
            const req = Utils.newRequest({
                someObject: {
                    foo: 'bar',
                }
            });
            const res = Utils.newResponse((payload) => {});
            
            frisk.validateRequest(testSchemas.objectSchema)(req,res,Spies.nextAccept);
            Spies.nextAccept.calledOnce.should.equal(true);
        });
    });
    context('When the schema has nested object properties', () => {
        it('Detects missing nested property', () => {
            const req = Utils.newRequest({
                someObject: {
                    foo: 'boo',
                }
            });
            const res = Utils.newResponse((payload) => {
                payload.message.should.equal('Invalid Request');
                payload.errors[0].name.should.equal('someObject.bar');
                payload.errors[0].error.should.equal('someObject.bar is a required field');
            });
            frisk.validateRequest(testSchemas.nestedSchema)(req,res,Spies.nextReject);
        });
        it('Detects when sub property is wrong type', () => {
            const req = Utils.newRequest({
                someObject: {
                    foo: 'boo',
                    bar: 'moo'
                }
            });
            const res = Utils.newResponse((payload) => {
                payload.message.should.equal('Invalid Request');
                payload.errors[0].name.should.equal('someObject.bar');
                payload.errors[0].error.should.equal('someObject.bar must be of type uuid');
            });
            frisk.validateRequest(testSchemas.nestedSchema)(req,res,Spies.nextAccept);
        });
        it('Accepts well formed sub-properties', () => {
            const req = Utils.newRequest({
                someObject: {
                    foo: 'boo',
                    bar: 'f952de91-d2f1-448a-ad99-abe46da99207'
                }
            });
            const res = Utils.newResponse((payload) => {
                payload.errors.should.be.empty();
            });
            frisk.validateRequest(testSchemas.nestedSchema)(req,res,Spies.nextAccept);
            Spies.nextAccept.calledOnce.should.equal(true);
        });
    });

    context('When parameters are defined in query, body, and params', () => {
        it('validates all parameters', () => {
            const req = {
                params: {
                    fruit: 'apple'
                },
                body: {
                    vegetable: 'carrot'
                },
                query: {
                    condiment: 'ketchup'
                } 
            };
            const res = Utils.newResponse((payload) => {
                throw new Error('Response should not be written to');
            });
            frisk.validateRequest(testSchemas.foodSchema, false)(req,res,Spies.nextAccept);
            Spies.nextAccept.calledOnce.should.equal(true);
        });
    });

    context('When passed undefined parameters', () => {
        context('Strict mode', () => {
            it('rejects undefined parameters', () => {
                const req = Utils.newRequest({
                    forest: 'trees',
                    someObject: {
                        boo: 'boo'
                    },
                    fish: 'salmon'
                });
                const res = Utils.newResponse((payload) => {
                    payload.message.should.equal('Invalid Request');
                    payload.errors[0].name.should.equal('forest');
                    payload.errors[0].error.should.equal('forest is not an allowed field');
                    payload.errors[1].name.should.equal('fish');
                    payload.errors[1].error.should.equal('fish is not an allowed field');
                });
                
                frisk.validateRequest(testSchemas.objectSchema, true)(req,res,Spies.nextReject);
            });
            it('rejects undefined nested parameters', () => {
                const req = Utils.newRequest({
                    forest: 'trees',
                    someObject: {
                        foo: 'boo',
                        bar: '0d150abe-125a-4565-91d8-01d565d648e7',
                        woo: 'ooh'
                    },
                });
                const res = Utils.newResponse((payload) => {
                    payload.message.should.equal('Invalid Request');
                    payload.errors.length.should.equal(2);
                    payload.errors[0].name.should.equal('someObject.woo');
                    payload.errors[0].error.should.equal('someObject.woo is not an allowed field');
                    payload.errors[1].name.should.equal('forest');
                    payload.errors[1].error.should.equal('forest is not an allowed field');
                });
                frisk.validateRequest(testSchemas.nestedSchema, true)(req,res,Spies.nextReject);
            });
            
        });
        context('not in strict mode', () => {
            it('allows undefined parameters', () => {
                const req = Utils.newRequest({
                    forest: 'trees',
                    someObject: {
                        foo: 'boo'
                    },
                    fish: 'salmon'
                });
                const res = Utils.newResponse((payload) => {
                    throw new Error('Response should not be written to');
                });
    
                frisk.validateRequest(testSchemas.objectSchema)(req,res,Spies.nextAccept);
                Spies.nextAccept.calledOnce.should.equal(true);
            });
        });
        context('Complex schema', () => {
            it('accepts valid request', () => { 
                const req = Utils.newRequest({
                    name: 'Fancy Diner',
                    address: {
                        streetNumber: 10,
                        streetName: 'main st',
                        city: 'ottawa',
                        province: 'ontario'
                    },
                    menus: {
                        lunch: {
                            appetizers: ['french fries', 'soup'],
                            mains: ['burger', 'veggie curry', 'chicken and waffles'],
                            desserts: ['ice cream', 'cake']
                        } ,
                        dinner: {
                            appetizers: ['fries', 'bigger soup'],
                            mains: ['steak', 'veggie curry'],
                            desserts: ['cheese cake', 'apple pie']
                        }   
                    }
                });
                const res = Utils.newResponse((payload) => {
                    payload.errors.should.be.empty();
                });
                frisk.validateRequest(testSchemas.restaurantSchema,true)(req,res,Spies.nextAccept);
                Spies.nextAccept.calledOnce.should.equal(true);
            });
            it('detects multiple errors', () => {
                const req = Utils.newRequest({
                    name: 456,
                    address: {
                        streetNumber: 10,
                        city: 'ottawa',
                    },
                    menus: {
                        dinner: {
                            appetizers: [123, 45],
                            desserts: ['cheese cake', 'apple pie']
                        }, 
                        brunch: {
                            desserts: ['cheese cake', 'apple pie']
                        }
                    },
                    liquorLicense: true
                });
                const res = Utils.newResponse((payload) => {
                    payload.errors.length.should.equal(8);
                    payload.errors[0].error.should.equal('address.streetName is a required field');
                    payload.errors[1].error.should.equal('address.province is a required field');
                    payload.errors[2].error.should.equal('name must be of type string');
                    payload.errors[3].error.should.equal('menus.lunch is a required field');
                    payload.errors[4].error.should.equal('menus.dinner.appetizers must be of type arrayOfStrings');
                    payload.errors[5].error.should.equal('menus.dinner.mains is a required field');
                    payload.errors[6].error.should.equal('menus.brunch is not an allowed field');
                    payload.errors[7].error.should.equal('liquorLicense is not an allowed field');
                });
                frisk.validateRequest(testSchemas.restaurantSchema,true)(req,res,Spies.nextReject);
            });

            // This fails right now

        });
    });

    it.skip('validates arrayOfStrings properly', () => {
        const req = Utils.newRequest({
            array: 'This Is Not An Array Of Strings!'
        });

        const res = Utils.newResponse((payload) => {
            payload.errors.should.not.be.empty();
        });

        const arrayOfStringsSchema = {
            array: {
                type: frisk.types.arrayOfStrings
            }
        };

        frisk.validateRequest(arrayOfStringsSchema)(req,res,Spies.nextReject);
    });

    context('When using \'in\' parameters', () => {

        context('not in strict mode', () => {


            it('finds parameters in each location', () => {

                const req = {
                    query: {
                        banana: 'nanana'
                    },
                    body: {
                        mango: 'derango'
                    },
                    params: {
                        strawberry: 'lawcherry'
                    }
                };

                const res = Utils.newResponse((payload) => {
                    payload.errors.shoud.be.empty();
                });

                frisk.validateRequest(testSchemas.fruitInDifferentLocations)(req, res, Spies.nextAccept);
                Spies.nextAccept.calledOnce.should.equal(true);
            });

            it('rejects if a required body parameter is not found in the body', () => {
                const req = {
                    query: {
                        mango: 'derango',
                        banana: 'nanana'
                    },
                    params: {
                        mango: 'derango',
                        strawberry: 'lawcherry'
                    }
                };

                const res = Utils.newResponse((payload) => {
                    payload.errors.should.be.lengthOf(1);
                    payload.errors.should.deep.include.members([
                        {
                            name: 'body.mango',
                            error: 'body.mango is a required field'
                        },
                    ])
                });
                frisk.validateRequest(testSchemas.fruitInDifferentLocations)(req, res, Spies.nextReject);
            });

            it('rejects if a required query parameter is not found in the query', () => {
                const req = {
                    body: {
                        mango: 'derango',
                        banana: 'nanana'
                    },
                    params: {
                        strawberry: 'lawcherry',
                        banana: 'nanana'
                    }
                };

                const res = Utils.newResponse((payload) => {
                    payload.errors.should.be.lengthOf(1);
                    payload.errors.should.deep.include.members([
                        {
                            name: 'query.banana',
                            error: 'query.banana is a required field'
                        },
                    ])
                });
                frisk.validateRequest(testSchemas.fruitInDifferentLocations)(req, res, Spies.nextReject);
            });

            it('rejects if a required params parameter in the params', () => {
                const req = {
                    query: {
                        banana: 'nanana',
                        strawberry: 'lawcherry'
                    },
                    body: {
                        mango: 'derango',
                        strawberry: 'lawcherry'
                    }
                };

                const res = Utils.newResponse((payload) => {
                    payload.errors.should.be.lengthOf(1);
                    payload.errors.should.deep.include.members([
                        {
                            error: 'params.strawberry is a required field',
                            name: 'params.strawberry'
                        }
                    ])
                });
                frisk.validateRequest(testSchemas.fruitInDifferentLocations)(req, res, Spies.nextReject);
            });

            it('rejects when there is a missing required and bad type in an object', () => {
                const req = {
                    body: {
                        address: {
                            apartmentNumber: 'notanumberlollolololol'
                        }
                    }
                };
                const res = Utils.newResponse((payload) => {
                    // payload.errors.should.be.lengthOf(2);
                    payload.errors.should.deep.include.members([
                        {
                            error: 'body.address.apartmentNumber must be of type number',
                            name: 'body.address.apartmentNumber'
                        },
                        {
                            error: 'body.address.streetNumber is a required field',
                            name: 'body.address.streetNumber'
                        }
                    ])
                })

                frisk.validateRequest(testSchemas.nestedBodySchema)(req, res, Spies.nextReject);
            })

        });

        context('incorrectly', () => {
            it('rejects a schema that is inconsistent with \'in\' usage', () => {
                const inconsistentSchema = {
                    companyId: {
                        type: frisk.types.uuid,
                        in: 'path',
                        required: true
                    },
                    teams: {
                        type: frisk.types.object
                    }
                };
                _.partial(frisk.validateRequest, inconsistentSchema).should.throw(
                    'The \'in\' property of key \'teams\' must be defined'
                );
            });

            it('rejects a schema that has an invalid value for the \'in\' property', () => {
                const invalidSchema = {
                    companyId: {
                        type: frisk.types.uuid,
                        in: 'param'
                    }
                };
                _.partial(frisk.validateRequest, invalidSchema).should.throw(
                    'Invalid value for the \'in\' property of key companyId: param. ' +
                    'Expected one of [body, params, query]'
                )
            });
        });
    });
});
