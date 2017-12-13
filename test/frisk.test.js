'use strict';

const chai = require('chai');
const should = chai.use(require('chai-as-promised')).should();

const Utils = require('./testing.utils.js');
const frisk = require('../lib/frisk');


const objectSchema  = {
    someObject: {
        required: true,
        type: frisk.types.object,
    } 
};


const nestedSchema  = {
    someObject: {
        required: true,
        type: frisk.types.object,
        properties: {
            foo: {
                required: true,
                type: frisk.types.string,
            },
            bar: {
                required: true,
                type: frisk.types.uuid,
            }
        }
    } 
}; 

describe('Express Frisk Middleware', () => {
    context('When the schema has an object at the top level', () => {
        
        it('Detects the missing property', () => {
            
            const req = Utils.newRequest({});
            const res = Utils.newResponse((payload) => {
                payload.message.should.equal('Invalid Request');
                payload.errors[0].name.should.equal('someObject');
                payload.errors[0].error.should.equal('someObject is a required field');
            });
            const next = () => {};
            frisk.validateRequest(objectSchema)(req,res,next);
        });
        it('Accepts the matching property', () => {
            const req = Utils.newRequest({
                someObject: {
                    foo: 'bar',
                }
            });
            const res = Utils.newResponse((payload) => {});
            
            let called = false;
            const next = () => { // TODO maybe use sinon calledonce?
                called = true;
            };
            frisk.validateRequest(objectSchema)(req,res,next);
            called.should.equal(true);
        });
    });
    context('When the schema has nested object properties', () => {
        it('Detects the missing nested property', () => {
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
            const next = () => { throw new Error('Next should not be called');};
            frisk.validateRequest(nestedSchema)(req,res,next);
        });
        it('Detects that sub property is wrong type', () => {
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
            const next = () => { throw new Error('Next should not be called');};
            frisk.validateRequest(nestedSchema)(req,res,next);
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
            
            let called = false;
            const next = () => { // TODO maybe use sinon calledonce?
                called = true;
            };
            frisk.validateRequest(nestedSchema)(req,res,next);
            called.should.equal(true);
            
        });

        it('Detects errors at multiple levels of nesting', null);
        
    });

    context('When parameters are defined in query, body, and params', () => {
        it('validates all parameters', () => {
            const schema = {
                fruit: {
                    required: true,
                    type: frisk.types.string
                },
                vegetable: {
                    required: true,
                    type: frisk.types.string
                },
                condiment: {
                    required: true,
                    type: frisk.types.string
                }
            };
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

            let called = false;
            const next = () => { // TODO maybe use sinon calledonce?
                called = true;
            };
            
            
            frisk.validateRequest(schema, false)(req,res,next);
            called.should.equal(true);

        });
    });

    context('When passed undefined parameters', () => {
        context('Strict mode', () => {
            it('rejects undefined parameters', () => {
                const req = Utils.newRequest({
                    forest: 'trees',
                    someObject: {
                        foo: 'boo'
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
                const next = () => { throw new Error('Next should not be called');};
                frisk.validateRequest(objectSchema, true)(req,res,next);
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
                const next = () => { throw new Error('Next should not be called');};
                frisk.validateRequest(nestedSchema, true)(req,res,next);
            });
            
        });

        context('Not strict mode', () => {
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
    
                let called = false;
                const next = () => { // TODO maybe use sinon calledonce?
                    called = true;
                };
                
                frisk.validateRequest(objectSchema)(req,res,next);
                called.should.equal(true);
            });
        });
        
        
    });

});

