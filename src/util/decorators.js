"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @enumerable decorator that sets the enumerable property of a class field to false.
 * @param value true|false
 */
function enumerable(value) {
    return (target, propertyKey) => {
        const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {};
        if (descriptor.enumerable !== value) {
            descriptor.enumerable = value;
            descriptor.writable = true;
            Object.defineProperty(target, propertyKey, descriptor);
        }
    };
}
exports.enumerable = enumerable;
//# sourceMappingURL=decorators.js.map