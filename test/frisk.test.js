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
        it('Detects the missing parameter', () => {
            
            const req = Utils.newRequest({});
            const res = Utils.newResponse((payload) => {
                payload.message.should.equal('Invalid Request');
                payload.errors[0].name.should.equal('someObject');
                payload.errors[0].error.should.equal('someObject is a required field');
            });
            const next = () => {};
            frisk.validateRequest(objectSchema)(req,res,next);
        });
        it('Accepts the matching parameter', () => {
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

});

