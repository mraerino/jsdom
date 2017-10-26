"use strict";

const HTMLElementFactory = require("../generated/HTMLElement");
const HTMLElement = HTMLElementFactory.interface;

module.exports = window => {
  const HTMLElementCreatable = function () {
    HTMLElementFactory.setup(this, [], {
      core: window._core,
      ownerDocument: window.document,
      localName: this.constructor._localName
    });
  };

  HTMLElementCreatable.prototype = HTMLElement.prototype;

  return HTMLElementCreatable;
};
