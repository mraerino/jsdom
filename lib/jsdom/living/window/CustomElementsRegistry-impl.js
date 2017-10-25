"use strict";

// https://html.spec.whatwg.org/multipage/scripting.html#customelementsregistry
// https://w3c.github.io/webcomponents/spec/custom/

const DOMException = require("domexception");
const isPCEN = require("is-potential-custom-element-name");
const tagMappings = require("../register-elements").mappings;
const HTMLUnknownElement = require("../generated/HTMLUnknownElement.js").interface;
const isCallable = require("is-callable");

// This is not right, but close enough for now
function isConstructor(fn) {
  const isArrowFunction = !fn.prototype;

  return !isArrowFunction;
}

function isUndefined(obj) {
  return obj === undefined;
}

function throwIfInvalidCallback(callback) {
  if (!isUndefined(callback) && !isCallable(callback)) {
    throw new TypeError();
  }
}

const reservedNames = [
  "annotation-xml",
  "color-profile",
  "font-face",
  "font-face-src",
  "font-face-uri",
  "font-face-format",
  "font-face-name",
  "missing-glyph"
].reduce((acc, name) => {
  acc[name] = true;
  return acc;
}, {});

// Create a mapping of tag names to interfaces so that we can detect
// if `extends` is valid.
const tagInterfaceMap = Object.keys(tagMappings).reduce(
  (mainMap, spec) => {
    Object.keys(tagMappings[spec]).reduce((specMap, elemKey) => {
      const element = tagMappings[spec][elemKey];
      element.tags.reduce((elemMap, tagName) => {
        elemMap[tagName] = element.file.interface;
        return elemMap;
      }, specMap);
      return specMap;
    }, mainMap);
    return mainMap;
  },
  {}
);

function isValidCustomElementName(name) {
  return isPCEN(name) && !reservedNames[name];
}

function isValidExtendsTag(tagName) {
  const iface = tagInterfaceMap[tagName];
  return iface && iface !== HTMLUnknownElement;
}

exports.implementation = class CustomElementsRegistryImpl {
  constructor(args, privateData) {
    this._customElementDefinitions = new Map();
    this._beingDefinedNames = new Set();
    this._beingDefinedConstructors = new Set();
    this._whenDefinedPromiseMap = new Map();
  }

  define(name, constructor, options) {
    options = options || {};

    // 1.
    if (!isConstructor(constructor)) {
      throw new TypeError();
    }

    // 3.
    if (!isValidCustomElementName(name)) {
      throw new DOMException("", "SyntaxError");
    }

    // 3. 4. 5. 6.
    if (this._customElementDefinitions.has(name) ||
      this._beingDefinedNames.has(name) ||
      this._customElementDefinitions.has(constructor) ||
      this._beingDefinedConstructors.has(name)) {
      throw new DOMException("", "NotSupportedError");
    }

    // 7.
    let localName = name;

    // 8.
    const extendss = options.extends || null;

    // 9.
    if (extendss !== null) {
      // 1. if extends is a custom element name
      if (isValidCustomElementName(extendss)) {
        throw new DOMException("", "NotSupportedError");
      }

      // TODO 2. if extends is HTMLUnknownElement
      if (!isValidExtendsTag(extendss)) {
        throw new DOMException("", "NotSupportedError");
      }

      localName = extendss;
    }

    // 10.
    this._beingDefinedNames.add(name);

    // 11.
    this._beingDefinedConstructors.add(constructor);

    // TODO 12. ?

    // 13.
    let observedAttributesIterable;
    let prototype;
    let connectedCallback;
    let disconnectedCallback;
    let adoptedCallback;
    let attributeChangedCallback;

    try {
      // 13.1
      try {
        observedAttributesIterable = constructor.observedAttributes;
      } catch (ex) {
        throw ex;
      }

      // 13.2
      if (observedAttributesIterable === undefined) {
        observedAttributesIterable = {};
      }

      // 13.3
      try {
        prototype = constructor.prototype;
      } catch (ex) {
        throw ex;
      }

      // 13.4
      if (typeof prototype !== "object") {
        throw new TypeError();
      }

      // 13.5
      try {
        connectedCallback = prototype.connectedCallback;
      } catch (ex) {
        throw ex;
      }
      throwIfInvalidCallback(connectedCallback);

      // 13.7
      try {
        disconnectedCallback = prototype.disconnectedCallback;
      } catch (ex) {
        throw ex;
      }
      throwIfInvalidCallback(disconnectedCallback);

      try {
        adoptedCallback = prototype.adoptedCallback;
      } catch (ex) {
        throw ex;
      }
      throwIfInvalidCallback(adoptedCallback);

      // 13.9
      try {
        attributeChangedCallback = prototype.attributeChangedCallback;
      } catch (ex) {
        throw ex;
      }
      throwIfInvalidCallback(attributeChangedCallback);
    } catch (ex) {
      this._beingDefinedNames.delete(name);
      this._beingDefinedConstructors.delete(name);

      throw ex;
    }

    // 14.
    const definition = {
      name,
      localName,
      constructor,
      prototype,
      observedAttributes: observedAttributesIterable,
      connectedCallback,
      disconnectedCallback,
      adoptedCallback,
      attributeChangedCallback
    };

    // 15.
    this._customElementDefinitions.set(name, definition);
    this._customElementDefinitions.set(constructor, definition);

    // TODO 16.
    // TODO 17.
    // TODO 18.

    // TODO 19.
    if (this._whenDefinedPromiseMap.has(name)) {
      this._whenDefinedPromiseMap.get(name).resolve();
      this._whenDefinedPromiseMap.delete(name);
    }
  }

  get(name) {
    const registry = this._customElementDefinitions;
    if (!registry.has(name)) {
      return undefined;
    }
    return registry.get(name).constructor;
  }

  whenDefined(name) {
    // TODO 1. check if a valid name

    // 2.
    const registry = this._customElementDefinitions;

    if (registry.has(name)) {
      return Promise.resolve();
    }

    // 3.
    const map = this._whenDefinedPromiseMap;

    // 4.
    if (!map.has(name)) {
      const promise = new Promise((resolve, reject) => {
        promise.resolve = resolve;
        promise.reject = reject;
      });
      map.set(name, promise);
    }

    // 5.
    const promise = map.get(name);

    // 6.
    return promise;
  }
};
