'use strict';

const chai = require('chai');
const should = chai.use(require('chai-as-promised')).should();

const Utils = require('./testing.utils.js');
const frisk = require('../lib/frisk');

describe('Express Frisk Middleware', () => {
    context('When the schema has an object at the top level', () => {
        const objectSchema  = {
            someObject: {
                required: true,
                type: frisk.types.object,
            } 
        };
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

        it('Strict mode - detects undefined parameters', null);
        it('Checks multiple levels of nesting', null);
        it('Checks values spread across body, query, and params', null);
    });

});

