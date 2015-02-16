// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (process['argv'].length > 1) {
    Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
  } else {
    Module['thisProgram'] = 'unknown-program';
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  this['Module'] = Module;

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WEB) {
    window['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    var source = Pointer_stringify(code);
    if (source[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (source.indexOf('"', 1) === source.length-1) {
        source = source.substr(1, source.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + source + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    try {
      // Module is the only 'upvar', which we provide directly. We also provide FS for legacy support.
      var evalled = eval('(function(Module, FS) { return function(' + args.join(',') + '){ ' + source + ' } })')(Module, typeof FS !== 'undefined' ? FS : null);
    } catch(e) {
      Module.printErr('error in executing inline EM_ASM code: ' + e + ' on: \n\n' + source + '\n\nwith args |' + args + '| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)');
      throw e;
    }
    return Runtime.asmConstCache[code] = evalled;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;









//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) Runtime.stackRestore(stack);
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;


function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module['Pointer_stringify'] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module['AsciiToString'] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module['stringToAscii'] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the a given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module['UTF8ArrayToString'] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8, ptr);
}
Module['UTF8ToString'] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module['stringToUTF8Array'] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}
Module['stringToUTF8'] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module['lengthBytesUTF8'] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}
Module['stringToUTF16'] = stringToUTF16;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}
Module['lengthBytesUTF16'] = lengthBytesUTF16;

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}
Module['stringToUTF32'] = stringToUTF32;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}
Module['lengthBytesUTF32'] = lengthBytesUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module['stackTrace'] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===





STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 2736;
  /* global initializers */ __ATINIT__.push();
  

var memoryInitializer = "woff2sfnt.js.mem";




var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


   
  Module["_i64Subtract"] = _i64Subtract;

  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

   
  Module["_memset"] = _memset;

  
  
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
  
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
  
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          fileStore.createIndex('timestamp', 'timestamp', { unique: false });
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function() { callback(this.error); };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function() { done(this.error); };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
  
      /*
      // Disabled, see https://github.com/kripken/emscripten/issues/2770
      stream = FS.getStreamFromPtr(stream);
      if (stream.stream_ops.flush) {
        stream.stream_ops.flush(stream);
      }
      */
    }var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },getStreamFromPtr:function (ptr) {
        return FS.streams[ptr - 1];
      },getPtrForStream:function (stream) {
        return stream ? stream.fd + 1 : 0;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=FS.getPtrForStream(stdin);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=FS.getPtrForStream(stdout);
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=FS.getPtrForStream(stderr);
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperty(node, "usedBytes", {
            get: function() { return this.contents.length; }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};function _close(fildes) {
      // int close(int fildes);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/close.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        FS.close(stream);
        return 0;
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }
  
  function _fsync(fildes) {
      // int fsync(int fildes);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fsync.html
      var stream = FS.getStream(fildes);
      if (stream) {
        // We write directly to the file system, so there's nothing to do here.
        return 0;
      } else {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
    }
  
  function _fileno(stream) {
      // int fileno(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fileno.html
      stream = FS.getStreamFromPtr(stream);
      if (!stream) return -1;
      return stream.fd;
    }function _fclose(stream) {
      // int fclose(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fclose.html
      var fd = _fileno(stream);
      _fsync(fd);
      return _close(fd);
    }

  
  function _strerror_r(errnum, strerrbuf, buflen) {
      if (errnum in ERRNO_MESSAGES) {
        if (ERRNO_MESSAGES[errnum].length > buflen - 1) {
          return ___setErrNo(ERRNO_CODES.ERANGE);
        } else {
          var msg = ERRNO_MESSAGES[errnum];
          writeAsciiToMemory(msg, strerrbuf);
          return 0;
        }
      } else {
        return ___setErrNo(ERRNO_CODES.EINVAL);
      }
    }function _strerror(errnum) {
      if (!_strerror.buffer) _strerror.buffer = _malloc(256);
      _strerror_r(errnum, _strerror.buffer, 256);
      return _strerror.buffer;
    }

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _abort() {
      Module['abort']();
    }

  
  
  
  
  
  function _mkport() { throw 'TODO' }var SOCKFS={mount:function (mount) {
        // If Module['websocket'] has already been defined (e.g. for configuring
        // the subprotocol/url) use that, if not initialise it to a new object.
        Module['websocket'] = (Module['websocket'] && 
                               ('object' === typeof Module['websocket'])) ? Module['websocket'] : {};
  
        // Add the Event registration mechanism to the exported websocket configuration
        // object so we can register network callbacks from native JavaScript too.
        // For more documentation see system/include/emscripten/emscripten.h
        Module['websocket']._callbacks = {};
        Module['websocket']['on'] = function(event, callback) {
  	    if ('function' === typeof callback) {
  		  this._callbacks[event] = callback;
          }
  	    return this;
        };
  
        Module['websocket'].emit = function(event, param) {
  	    if ('function' === typeof this._callbacks[event]) {
  		  this._callbacks[event].call(this, param);
          }
        };
  
        // If debug is enabled register simple default logging callbacks for each Event.
  
        return FS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createSocket:function (family, type, protocol) {
        var streaming = type == 1;
        if (protocol) {
          assert(streaming == (protocol == 6)); // if SOCK_STREAM, must be tcp
        }
  
        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          error: null, // Used in getsockopt for SOL_SOCKET/SO_ERROR test
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops
        };
  
        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname();
        var node = FS.createNode(SOCKFS.root, name, 49152, 0);
        node.sock = sock;
  
        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: FS.modeStringToFlags('r+'),
          seekable: false,
          stream_ops: SOCKFS.stream_ops
        });
  
        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream;
  
        return sock;
      },getSocket:function (fd) {
        var stream = FS.getStream(fd);
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null;
        }
        return stream.node.sock;
      },stream_ops:{poll:function (stream) {
          var sock = stream.node.sock;
          return sock.sock_ops.poll(sock);
        },ioctl:function (stream, request, varargs) {
          var sock = stream.node.sock;
          return sock.sock_ops.ioctl(sock, request, varargs);
        },read:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          var msg = sock.sock_ops.recvmsg(sock, length);
          if (!msg) {
            // socket is closed
            return 0;
          }
          buffer.set(msg.buffer, offset);
          return msg.buffer.length;
        },write:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          return sock.sock_ops.sendmsg(sock, buffer, offset, length);
        },close:function (stream) {
          var sock = stream.node.sock;
          sock.sock_ops.close(sock);
        }},nextname:function () {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0;
        }
        return 'socket[' + (SOCKFS.nextname.current++) + ']';
      },websocket_sock_ops:{createPeer:function (sock, addr, port) {
          var ws;
  
          if (typeof addr === 'object') {
            ws = addr;
            addr = null;
            port = null;
          }
  
          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress;
              port = ws._socket.remotePort;
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
              if (!result) {
                throw new Error('WebSocket URL must be in the format ws(s)://address:port');
              }
              addr = result[1];
              port = parseInt(result[2], 10);
            }
          } else {
            // create the actual websocket object and connect
            try {
              // runtimeConfig gets set to true if WebSocket runtime configuration is available.
              var runtimeConfig = (Module['websocket'] && ('object' === typeof Module['websocket']));
  
              // The default value is 'ws://' the replace is needed because the compiler replaces '//' comments with '#'
              // comments without checking context, so we'd end up with ws:#, the replace swaps the '#' for '//' again.
              var url = 'ws:#'.replace('#', '//');
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['url']) {
                  url = Module['websocket']['url']; // Fetch runtime WebSocket URL config.
                }
              }
  
              if (url === 'ws://' || url === 'wss://') { // Is the supplied URL config just a prefix, if so complete it.
                var parts = addr.split('/');
                url = url + parts[0] + ":" + port + "/" + parts.slice(1).join('/');
              }
  
              // Make the WebSocket subprotocol (Sec-WebSocket-Protocol) default to binary if no configuration is set.
              var subProtocols = 'binary'; // The default value is 'binary'
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['subprotocol']) {
                  subProtocols = Module['websocket']['subprotocol']; // Fetch runtime WebSocket subprotocol config.
                }
              }
  
              // The regex trims the string (removes spaces at the beginning and end, then splits the string by
              // <any space>,<any space> into an Array. Whitespace removal is important for Websockify and ws.
              subProtocols = subProtocols.replace(/^ +| +$/g,"").split(/ *, */);
  
              // The node ws library API for specifying optional subprotocol is slightly different than the browser's.
              var opts = ENVIRONMENT_IS_NODE ? {'protocol': subProtocols.toString()} : subProtocols;
  
              // If node we use the ws library.
              var WebSocket = ENVIRONMENT_IS_NODE ? require('ws') : window['WebSocket'];
              ws = new WebSocket(url, opts);
              ws.binaryType = 'arraybuffer';
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
            }
          }
  
  
          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: []
          };
  
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
  
          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport !== 'undefined') {
            peer.dgram_send_queue.push(new Uint8Array([
                255, 255, 255, 255,
                'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0),
                ((sock.sport & 0xff00) >> 8) , (sock.sport & 0xff)
            ]));
          }
  
          return peer;
        },getPeer:function (sock, addr, port) {
          return sock.peers[addr + ':' + port];
        },addPeer:function (sock, peer) {
          sock.peers[peer.addr + ':' + peer.port] = peer;
        },removePeer:function (sock, peer) {
          delete sock.peers[peer.addr + ':' + peer.port];
        },handlePeerEvents:function (sock, peer) {
          var first = true;
  
          var handleOpen = function () {
  
            Module['websocket'].emit('open', sock.stream.fd);
  
            try {
              var queued = peer.dgram_send_queue.shift();
              while (queued) {
                peer.socket.send(queued);
                queued = peer.dgram_send_queue.shift();
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close();
            }
          };
  
          function handleMessage(data) {
            assert(typeof data !== 'string' && data.byteLength !== undefined);  // must receive an ArrayBuffer
            data = new Uint8Array(data);  // make a typed array view on the array buffer
  
  
            // if this is the port message, override the peer's port with it
            var wasfirst = first;
            first = false;
            if (wasfirst &&
                data.length === 10 &&
                data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 &&
                data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
              // update the peer's port and it's key in the peer map
              var newport = ((data[8] << 8) | data[9]);
              SOCKFS.websocket_sock_ops.removePeer(sock, peer);
              peer.port = newport;
              SOCKFS.websocket_sock_ops.addPeer(sock, peer);
              return;
            }
  
            sock.recv_queue.push({ addr: peer.addr, port: peer.port, data: data });
            Module['websocket'].emit('message', sock.stream.fd);
          };
  
          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on('open', handleOpen);
            peer.socket.on('message', function(data, flags) {
              if (!flags.binary) {
                return;
              }
              handleMessage((new Uint8Array(data)).buffer);  // copy from node Buffer -> ArrayBuffer
            });
            peer.socket.on('close', function() {
              Module['websocket'].emit('close', sock.stream.fd);
            });
            peer.socket.on('error', function(error) {
              // Although the ws library may pass errors that may be more descriptive than
              // ECONNREFUSED they are not necessarily the expected error code e.g. 
              // ENOTFOUND on getaddrinfo seems to be node.js specific, so using ECONNREFUSED
              // is still probably the most useful thing to do.
              sock.error = ERRNO_CODES.ECONNREFUSED; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
              Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'ECONNREFUSED: Connection refused']);
              // don't throw
            });
          } else {
            peer.socket.onopen = handleOpen;
            peer.socket.onclose = function() {
              Module['websocket'].emit('close', sock.stream.fd);
            };
            peer.socket.onmessage = function peer_socket_onmessage(event) {
              handleMessage(event.data);
            };
            peer.socket.onerror = function(error) {
              // The WebSocket spec only allows a 'simple event' to be thrown on error,
              // so we only really know as much as ECONNREFUSED.
              sock.error = ERRNO_CODES.ECONNREFUSED; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
              Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'ECONNREFUSED: Connection refused']);
            };
          }
        },poll:function (sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? (64 | 1) : 0;
          }
  
          var mask = 0;
          var dest = sock.type === 1 ?  // we only care about the socket state for connection-based sockets
            SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) :
            null;
  
          if (sock.recv_queue.length ||
              !dest ||  // connection-less sockets are always ready to read
              (dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {  // let recv return 0 once closed
            mask |= (64 | 1);
          }
  
          if (!dest ||  // connection-less sockets are always ready to write
              (dest && dest.socket.readyState === dest.socket.OPEN)) {
            mask |= 4;
          }
  
          if ((dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {
            mask |= 16;
          }
  
          return mask;
        },ioctl:function (sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0;
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length;
              }
              HEAP32[((arg)>>2)]=bytes;
              return 0;
            default:
              return ERRNO_CODES.EINVAL;
          }
        },close:function (sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close();
            } catch (e) {
            }
            sock.server = null;
          }
          // close any peer connections
          var peers = Object.keys(sock.peers);
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]];
            try {
              peer.socket.close();
            } catch (e) {
            }
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          }
          return 0;
        },bind:function (sock, addr, port) {
          if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already bound
          }
          sock.saddr = addr;
          sock.sport = port || _mkport();
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close();
              sock.server = null;
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0);
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e;
              if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
            }
          }
        },connect:function (sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
  
          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }
  
          // early out if we're already connected / in the middle of connecting
          if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
              } else {
                throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
              }
            }
          }
  
          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          sock.daddr = peer.addr;
          sock.dport = peer.port;
  
          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
        },listen:function (sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
          if (sock.server) {
             throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already listening
          }
          var WebSocketServer = require('ws').Server;
          var host = sock.saddr;
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport
            // TODO support backlog
          });
          Module['websocket'].emit('listen', sock.stream.fd); // Send Event with listen fd.
  
          sock.server.on('connection', function(ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
  
              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
              newsock.daddr = peer.addr;
              newsock.dport = peer.port;
  
              // push to queue for accept to pick up
              sock.pending.push(newsock);
              Module['websocket'].emit('connection', newsock.stream.fd);
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws);
              Module['websocket'].emit('connection', sock.stream.fd);
            }
          });
          sock.server.on('closed', function() {
            Module['websocket'].emit('close', sock.stream.fd);
            sock.server = null;
          });
          sock.server.on('error', function(error) {
            // Although the ws library may pass errors that may be more descriptive than
            // ECONNREFUSED they are not necessarily the expected error code e.g. 
            // ENOTFOUND on getaddrinfo seems to be node.js specific, so using EHOSTUNREACH
            // is still probably the most useful thing to do. This error shouldn't
            // occur in a well written app as errors should get trapped in the compiled
            // app's own getaddrinfo call.
            sock.error = ERRNO_CODES.EHOSTUNREACH; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
            Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'EHOSTUNREACH: Host is unreachable']);
            // don't throw
          });
        },accept:function (listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          var newsock = listensock.pending.shift();
          newsock.stream.flags = listensock.stream.flags;
          return newsock;
        },getname:function (sock, peer) {
          var addr, port;
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            }
            addr = sock.daddr;
            port = sock.dport;
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0;
            port = sock.sport || 0;
          }
          return { addr: addr, port: port };
        },sendmsg:function (sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr;
              port = sock.dport;
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr;
            port = sock.dport;
          }
  
          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
  
          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          var data;
          if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
            data = buffer.slice(offset, offset + length);
          } else {  // ArrayBufferView
            data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
          }
  
          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
              }
              dest.dgram_send_queue.push(data);
              return length;
            }
          }
  
          try {
            // send the actual data
            dest.socket.send(data);
            return length;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
        },recvmsg:function (sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          }
  
          var queued = sock.recv_queue.shift();
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
  
              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
              }
              else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                // return null if the socket has closed
                return null;
              }
              else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length;
          var queuedOffset = queued.data.byteOffset || 0;
          var queuedBuffer = queued.data.buffer || queued.data;
          var bytesRead = Math.min(length, queuedLength);
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port
          };
  
  
          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead;
            queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
            sock.recv_queue.unshift(queued);
          }
  
          return res;
        }}};function _send(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _write(fd, buf, len);
    }
  
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
  
  
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var fd = _fileno(stream);
      var bytesWritten = _write(fd, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        var streamObj = FS.getStreamFromPtr(stream);
        if (streamObj) streamObj.error = true;
        return 0;
      } else {
        return (bytesWritten / size)|0;
      }
    }
  
  
   
  Module["_strlen"] = _strlen;
  
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = (HEAP32[((tempDoublePtr)>>2)]=HEAP32[(((varargs)+(argIndex))>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((varargs)+((argIndex)+(4)))>>2)],(+(HEAPF64[(tempDoublePtr)>>3])));
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+4))>>2)]];
  
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Runtime.getNativeFieldSize(type);
        return ret;
      }
  
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[((textIndex)>>0)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)>>0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          var flagPadSign = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              case 32:
                flagPadSign = true;
                break;
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
          }
  
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)>>0)];
            }
          }
  
          // Handle precision.
          var precisionSet = false, precision = -1;
          if (next == 46) {
            precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)>>0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)>>0)];
          }
          if (precision < 0) {
            precision = 6; // Standard default.
            precisionSet = false;
          }
  
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)>>0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)>>0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)>>0)];
  
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
  
              // Add sign if needed
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  prefix = '+' + prefix;
                } else if (flagPadSign) {
                  prefix = ' ' + prefix;
                }
              }
  
              // Move sign to prefix so we zero-pad after the sign
              if (argText.charAt(0) == '-') {
                prefix = '-' + prefix;
                argText = argText.substr(1);
              }
  
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
  
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
  
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
  
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
  
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
  
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
  
                // Add sign.
                if (currArg >= 0) {
                  if (flagAlwaysSigned) {
                    argText = '+' + argText;
                  } else if (flagPadSign) {
                    argText = ' ' + argText;
                  }
                }
              }
  
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
  
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
  
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)>>0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length;
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[((i)>>0)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }function _fprintf(stream, format, varargs) {
      // int fprintf(FILE *restrict stream, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var stack = Runtime.stackSave();
      var ret = _fwrite(allocate(result, 'i8', ALLOC_STACK), 1, result.length, stream);
      Runtime.stackRestore(stack);
      return ret;
    }

  function _printf(format, varargs) {
      // int printf(const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var stdout = HEAP32[((_stdout)>>2)];
      return _fprintf(stdout, format, varargs);
    }

  
  function _open(path, oflag, varargs) {
      // int open(const char *path, int oflag, ...);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/open.html
      var mode = HEAP32[((varargs)>>2)];
      path = Pointer_stringify(path);
      try {
        var stream = FS.open(path, oflag, mode);
        return stream.fd;
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _fopen(filename, mode) {
      // FILE *fopen(const char *restrict filename, const char *restrict mode);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fopen.html
      var flags;
      mode = Pointer_stringify(mode);
      if (mode[0] == 'r') {
        if (mode.indexOf('+') != -1) {
          flags = 2;
        } else {
          flags = 0;
        }
      } else if (mode[0] == 'w') {
        if (mode.indexOf('+') != -1) {
          flags = 2;
        } else {
          flags = 1;
        }
        flags |= 64;
        flags |= 512;
      } else if (mode[0] == 'a') {
        if (mode.indexOf('+') != -1) {
          flags = 2;
        } else {
          flags = 1;
        }
        flags |= 64;
        flags |= 1024;
      } else {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return 0;
      }
      var fd = _open(filename, flags, allocate([0x1FF, 0, 0, 0], 'i32', ALLOC_STACK));  // All creation permissions.
      return fd === -1 ? 0 : FS.getPtrForStream(FS.getStream(fd));
    }


   
  Module["_i64Add"] = _i64Add;

  
  function _fputs(s, stream) {
      // int fputs(const char *restrict s, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fputs.html
      var fd = _fileno(stream);
      return _write(fd, s, _strlen(s));
    }
  
  function _fputc(c, stream) {
      // int fputc(int c, FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fputc.html
      var chr = unSign(c & 0xFF);
      HEAP8[((_fputc.ret)>>0)]=chr;
      var fd = _fileno(stream);
      var ret = _write(fd, _fputc.ret, 1);
      if (ret == -1) {
        var streamObj = FS.getStreamFromPtr(stream);
        if (streamObj) streamObj.error = true;
        return -1;
      } else {
        return chr;
      }
    }function _puts(s) {
      // int puts(const char *s);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/puts.html
      // NOTE: puts() always writes an extra newline.
      var stdout = HEAP32[((_stdout)>>2)];
      var ret = _fputs(s, stdout);
      if (ret < 0) {
        return ret;
      } else {
        var newlineRet = _fputc(10, stdout);
        return (newlineRet < 0) ? -1 : ret + 1;
      }
    }


  
  function _lseek(fildes, offset, whence) {
      // off_t lseek(int fildes, off_t offset, int whence);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/lseek.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        return FS.llseek(stream, offset, whence);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _fseek(stream, offset, whence) {
      // int fseek(FILE *stream, long offset, int whence);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fseek.html
      var fd = _fileno(stream);
      var ret = _lseek(fd, offset, whence);
      if (ret == -1) {
        return -1;
      }
      stream = FS.getStreamFromPtr(stream);
      stream.eof = false;
      return 0;
    }


  function _ftell(stream) {
      // long ftell(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/ftell.html
      stream = FS.getStreamFromPtr(stream);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      if (FS.isChrdev(stream.node.mode)) {
        ___setErrNo(ERRNO_CODES.ESPIPE);
        return -1;
      } else {
        return stream.position;
      }
    }

  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
      else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
      Browser.mainLoop.scheduler();
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
        
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvasContainer.requestFullScreen();
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              Browser.lastTouches[touch.identifier] = Browser.touches[touch.identifier];
              Browser.touches[touch.identifier] = { x: adjustedX, y: adjustedY };
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

  
  
  function _recv(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _read(fd, buf, len);
    }
  
  function _pread(fildes, buf, nbyte, offset) {
      // ssize_t pread(int fildes, void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/read.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.read(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _read(fildes, buf, nbyte) {
      // ssize_t read(int fildes, void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/read.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
  
  
      try {
        var slab = HEAP8;
        return FS.read(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _fread(ptr, size, nitems, stream) {
      // size_t fread(void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fread.html
      var bytesToRead = nitems * size;
      if (bytesToRead == 0) {
        return 0;
      }
      var bytesRead = 0;
      var streamObj = FS.getStreamFromPtr(stream);
      if (!streamObj) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return 0;
      }
      while (streamObj.ungotten.length && bytesToRead > 0) {
        HEAP8[((ptr++)>>0)]=streamObj.ungotten.pop();
        bytesToRead--;
        bytesRead++;
      }
      var err = _read(streamObj.fd, ptr, bytesToRead);
      if (err == -1) {
        if (streamObj) streamObj.error = true;
        return 0;
      }
      bytesRead += err;
      if (bytesRead < bytesToRead) streamObj.eof = true;
      return (bytesRead / size)|0;
    }

  function _uncompress() {
  Module['printErr']('missing function: uncompress'); abort(-1);
  }

  var _BDtoILow=true;

  var _BDtoIHigh=true;

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }

  function ___errno_location() {
      return ___errno_state;
    }

  var _BItoD=true;

   
  Module["_llvm_bswap_i32"] = _llvm_bswap_i32;

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }


___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
__ATINIT__.push({ func: function() { SOCKFS.root = FS.mount(SOCKFS, {}, null); } });
_fputc.ret = allocate([0], "i8", ALLOC_STATIC);
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var ctlz_i8 = allocate([8,7,6,6,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_DYNAMIC);
 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array };
Module.asmLibraryArg = { "abort": abort, "assert": assert, "min": Math_min, "invoke_iiii": invoke_iiii, "invoke_iii": invoke_iii, "_send": _send, "_fread": _fread, "_abort": _abort, "_lseek": _lseek, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_fflush": _fflush, "_pwrite": _pwrite, "_strerror_r": _strerror_r, "_open": _open, "_sbrk": _sbrk, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_fileno": _fileno, "_sysconf": _sysconf, "_close": _close, "_fseek": _fseek, "_pread": _pread, "_puts": _puts, "_mkport": _mkport, "_fclose": _fclose, "__reallyNegative": __reallyNegative, "_write": _write, "_fsync": _fsync, "_ftell": _ftell, "___errno_location": ___errno_location, "_recv": _recv, "_printf": _printf, "__exit": __exit, "_read": _read, "_fputc": _fputc, "_emscripten_set_main_loop": _emscripten_set_main_loop, "_uncompress": _uncompress, "_fwrite": _fwrite, "_time": _time, "_fprintf": _fprintf, "_strerror": _strerror, "__formatString": __formatString, "_fputs": _fputs, "_fopen": _fopen, "_exit": _exit, "___setErrNo": ___setErrNo, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8, "ctlz_i8": ctlz_i8, "NaN": NaN, "Infinity": Infinity, "_stderr": _stderr, "_stdout": _stdout };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'use asm';
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;
  var ctlz_i8=env.ctlz_i8|0;
  var _stderr=env._stderr|0;
  var _stdout=env._stdout|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = +env.NaN, inf = +env.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var abort=env.abort;
  var assert=env.assert;
  var Math_min=env.min;
  var invoke_iiii=env.invoke_iiii;
  var invoke_iii=env.invoke_iii;
  var _send=env._send;
  var _fread=env._fread;
  var _abort=env._abort;
  var _lseek=env._lseek;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _fflush=env._fflush;
  var _pwrite=env._pwrite;
  var _strerror_r=env._strerror_r;
  var _open=env._open;
  var _sbrk=env._sbrk;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _fileno=env._fileno;
  var _sysconf=env._sysconf;
  var _close=env._close;
  var _fseek=env._fseek;
  var _pread=env._pread;
  var _puts=env._puts;
  var _mkport=env._mkport;
  var _fclose=env._fclose;
  var __reallyNegative=env.__reallyNegative;
  var _write=env._write;
  var _fsync=env._fsync;
  var _ftell=env._ftell;
  var ___errno_location=env.___errno_location;
  var _recv=env._recv;
  var _printf=env._printf;
  var __exit=env.__exit;
  var _read=env._read;
  var _fputc=env._fputc;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var _uncompress=env._uncompress;
  var _fwrite=env._fwrite;
  var _time=env._time;
  var _fprintf=env._fprintf;
  var _strerror=env._strerror;
  var __formatString=env.__formatString;
  var _fputs=env._fputs;
  var _fopen=env._fopen;
  var _exit=env._exit;
  var ___setErrNo=env.___setErrNo;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
STACKTOP = (STACKTOP + 15)&-16;

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}
function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _woffDecode($woffData,$woffLen,$sfntLen,$pStatus) {
 $woffData = $woffData|0;
 $woffLen = $woffLen|0;
 $sfntLen = $sfntLen|0;
 $pStatus = $pStatus|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $status = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $status = sp;
 HEAP32[$status>>2] = 0;
 $0 = ($pStatus|0)!=(0|0);
 if ($0) {
  $1 = HEAP32[$pStatus>>2]|0;
  $2 = $1 & 255;
  $3 = ($2|0)==(0);
  if (!($3)) {
   $$0 = 0;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $4 = (_sanityCheck($woffData,$woffLen)|0);
 HEAP32[$status>>2] = $4;
 $5 = $4 & 255;
 $6 = ($5|0)==(0);
 do {
  if ($6) {
   $7 = (($woffData) + 16|0);
   $8 = HEAP8[$7>>0]|0;
   $9 = $8&255;
   $10 = $9 << 24;
   $11 = (($woffData) + 17|0);
   $12 = HEAP8[$11>>0]|0;
   $13 = $12&255;
   $14 = $13 << 16;
   $15 = $14 | $10;
   $16 = (($woffData) + 18|0);
   $17 = HEAP8[$16>>0]|0;
   $18 = $17&255;
   $19 = $18 << 8;
   $20 = $15 | $19;
   $21 = (($woffData) + 19|0);
   $22 = HEAP8[$21>>0]|0;
   $23 = $22&255;
   $24 = $20 | $23;
   $25 = (_malloc($24)|0);
   $26 = ($25|0)==(0|0);
   if ($26) {
    $27 = $4 | 1;
    HEAP32[$status>>2] = $27;
    break;
   }
   _woffDecodeToBufferInternal($woffData,$25,$sfntLen,$status);
   $28 = HEAP32[$status>>2]|0;
   $29 = $28 & 255;
   $30 = ($29|0)==(0);
   if (!($30)) {
    HEAP32[$status>>2] = $28;
    _free($25);
    break;
   }
   if (!($0)) {
    $$0 = $25;
    STACKTOP = sp;return ($$0|0);
   }
   $31 = HEAP32[$pStatus>>2]|0;
   $32 = $31 | $28;
   HEAP32[$pStatus>>2] = $32;
   $$0 = $25;
   STACKTOP = sp;return ($$0|0);
  } else {
   HEAP32[$status>>2] = $4;
  }
 } while(0);
 if (!($0)) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $33 = HEAP32[$status>>2]|0;
 HEAP32[$pStatus>>2] = $33;
 $$0 = 0;
 STACKTOP = sp;return ($$0|0);
}
function _woffGetMetadata($woffData,$woffLen,$metaLen,$pStatus) {
 $woffData = $woffData|0;
 $woffLen = $woffLen|0;
 $metaLen = $metaLen|0;
 $pStatus = $pStatus|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0;
 var $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $or$cond = 0, $or$cond3 = 0, $or$cond5 = 0, $origLen = 0, $status$06 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $origLen = sp;
 $0 = ($pStatus|0)!=(0|0);
 if ($0) {
  $1 = HEAP32[$pStatus>>2]|0;
  $2 = $1 & 255;
  $3 = ($2|0)==(0);
  if (!($3)) {
   $$0 = 0;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $4 = (_sanityCheck($woffData,$woffLen)|0);
 $5 = $4 & 255;
 $6 = ($5|0)==(0);
 do {
  if ($6) {
   $7 = (($woffData) + 24|0);
   $8 = HEAP8[$7>>0]|0;
   $9 = $8&255;
   $10 = $9 << 24;
   $11 = (($woffData) + 25|0);
   $12 = HEAP8[$11>>0]|0;
   $13 = $12&255;
   $14 = $13 << 16;
   $15 = $14 | $10;
   $16 = (($woffData) + 26|0);
   $17 = HEAP8[$16>>0]|0;
   $18 = $17&255;
   $19 = $18 << 8;
   $20 = $15 | $19;
   $21 = (($woffData) + 27|0);
   $22 = HEAP8[$21>>0]|0;
   $23 = $22&255;
   $24 = $20 | $23;
   $25 = (($woffData) + 28|0);
   $26 = HEAP8[$25>>0]|0;
   $27 = $26&255;
   $28 = $27 << 24;
   $29 = (($woffData) + 29|0);
   $30 = HEAP8[$29>>0]|0;
   $31 = $30&255;
   $32 = $31 << 16;
   $33 = $32 | $28;
   $34 = (($woffData) + 30|0);
   $35 = HEAP8[$34>>0]|0;
   $36 = $35&255;
   $37 = $36 << 8;
   $38 = $33 | $37;
   $39 = (($woffData) + 31|0);
   $40 = HEAP8[$39>>0]|0;
   $41 = $40&255;
   $42 = $38 | $41;
   $43 = (($woffData) + 32|0);
   $44 = HEAP8[$43>>0]|0;
   $45 = $44&255;
   $46 = $45 << 24;
   $47 = (($woffData) + 33|0);
   $48 = HEAP8[$47>>0]|0;
   $49 = $48&255;
   $50 = $49 << 16;
   $51 = $50 | $46;
   $52 = (($woffData) + 34|0);
   $53 = HEAP8[$52>>0]|0;
   $54 = $53&255;
   $55 = $54 << 8;
   $56 = $51 | $55;
   $57 = (($woffData) + 35|0);
   $58 = HEAP8[$57>>0]|0;
   $59 = $58&255;
   $60 = $56 | $59;
   HEAP32[$origLen>>2] = $60;
   $61 = ($24|0)==(0);
   $62 = ($42|0)==(0);
   $or$cond = $61 | $62;
   $63 = ($60|0)==(0);
   $or$cond3 = $or$cond | $63;
   if ($or$cond3) {
    $$0 = 0;
    STACKTOP = sp;return ($$0|0);
   }
   $64 = ($42>>>0)>($woffLen>>>0);
   $65 = (($woffLen) - ($42))|0;
   $66 = ($24>>>0)>($65>>>0);
   $or$cond5 = $64 | $66;
   if ($or$cond5) {
    $67 = $4 | 2;
    $status$06 = $67;
    break;
   }
   $68 = (_malloc($60)|0);
   $69 = ($68|0)==(0|0);
   if ($69) {
    $70 = $4 | 1;
    $status$06 = $70;
    break;
   }
   $71 = (($woffData) + ($24)|0);
   $72 = (_uncompress(($68|0),($origLen|0),($71|0),($42|0))|0);
   $73 = ($72|0)==(0);
   if ($73) {
    $74 = HEAP32[$origLen>>2]|0;
    $75 = HEAP8[$43>>0]|0;
    $76 = $75&255;
    $77 = $76 << 24;
    $78 = HEAP8[$47>>0]|0;
    $79 = $78&255;
    $80 = $79 << 16;
    $81 = $80 | $77;
    $82 = HEAP8[$52>>0]|0;
    $83 = $82&255;
    $84 = $83 << 8;
    $85 = $81 | $84;
    $86 = HEAP8[$57>>0]|0;
    $87 = $86&255;
    $88 = $85 | $87;
    $89 = ($74|0)==($88|0);
    if ($89) {
     $90 = ($metaLen|0)==(0|0);
     if (!($90)) {
      HEAP32[$metaLen>>2] = $74;
     }
     if (!($0)) {
      $$0 = $68;
      STACKTOP = sp;return ($$0|0);
     }
     $91 = HEAP32[$pStatus>>2]|0;
     $92 = $91 | $4;
     HEAP32[$pStatus>>2] = $92;
     $$0 = $68;
     STACKTOP = sp;return ($$0|0);
    }
   }
   $93 = $4 | 3;
   _free($68);
   $status$06 = $93;
  } else {
   $status$06 = $4;
  }
 } while(0);
 if (!($0)) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 HEAP32[$pStatus>>2] = $status$06;
 $$0 = 0;
 STACKTOP = sp;return ($$0|0);
}
function _woffGetPrivateData($woffData,$woffLen,$privLen,$pStatus) {
 $woffData = $woffData|0;
 $woffLen = $woffLen|0;
 $privLen = $privLen|0;
 $pStatus = $pStatus|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond3 = 0, $status$0$ph = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($pStatus|0)!=(0|0);
 if ($0) {
  $1 = HEAP32[$pStatus>>2]|0;
  $2 = $1 & 255;
  $3 = ($2|0)==(0);
  if (!($3)) {
   $$0 = 0;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $4 = (_sanityCheck($woffData,$woffLen)|0);
 $5 = $4 & 255;
 $6 = ($5|0)==(0);
 do {
  if ($6) {
   $7 = (($woffData) + 36|0);
   $8 = HEAP8[$7>>0]|0;
   $9 = $8&255;
   $10 = $9 << 24;
   $11 = (($woffData) + 37|0);
   $12 = HEAP8[$11>>0]|0;
   $13 = $12&255;
   $14 = $13 << 16;
   $15 = $14 | $10;
   $16 = (($woffData) + 38|0);
   $17 = HEAP8[$16>>0]|0;
   $18 = $17&255;
   $19 = $18 << 8;
   $20 = $15 | $19;
   $21 = (($woffData) + 39|0);
   $22 = HEAP8[$21>>0]|0;
   $23 = $22&255;
   $24 = $20 | $23;
   $25 = (($woffData) + 40|0);
   $26 = HEAP8[$25>>0]|0;
   $27 = $26&255;
   $28 = $27 << 24;
   $29 = (($woffData) + 41|0);
   $30 = HEAP8[$29>>0]|0;
   $31 = $30&255;
   $32 = $31 << 16;
   $33 = $32 | $28;
   $34 = (($woffData) + 42|0);
   $35 = HEAP8[$34>>0]|0;
   $36 = $35&255;
   $37 = $36 << 8;
   $38 = $33 | $37;
   $39 = (($woffData) + 43|0);
   $40 = HEAP8[$39>>0]|0;
   $41 = $40&255;
   $42 = $38 | $41;
   $43 = ($24|0)==(0);
   $44 = ($42|0)==(0);
   $or$cond = $43 | $44;
   if ($or$cond) {
    $$0 = 0;
    STACKTOP = sp;return ($$0|0);
   }
   $45 = ($42>>>0)>($woffLen>>>0);
   $46 = (($woffLen) - ($42))|0;
   $47 = ($24>>>0)>($46>>>0);
   $or$cond3 = $45 | $47;
   if ($or$cond3) {
    $48 = $4 | 2;
    $status$0$ph = $48;
    break;
   }
   $49 = (_malloc($42)|0);
   $50 = ($49|0)==(0|0);
   if ($50) {
    $51 = $4 | 1;
    $status$0$ph = $51;
    break;
   }
   $52 = (($woffData) + ($24)|0);
   _memcpy(($49|0),($52|0),($42|0))|0;
   $53 = ($privLen|0)==(0|0);
   if (!($53)) {
    HEAP32[$privLen>>2] = $42;
   }
   if (!($0)) {
    $$0 = $49;
    STACKTOP = sp;return ($$0|0);
   }
   $54 = HEAP32[$pStatus>>2]|0;
   $55 = $54 | $4;
   HEAP32[$pStatus>>2] = $55;
   $$0 = $49;
   STACKTOP = sp;return ($$0|0);
  } else {
   $status$0$ph = $4;
  }
 } while(0);
 if (!($0)) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 HEAP32[$pStatus>>2] = $status$0$ph;
 $$0 = 0;
 STACKTOP = sp;return ($$0|0);
}
function _woffGetFontVersion($woffData,$woffLen,$major,$minor,$pStatus) {
 $woffData = $woffData|0;
 $woffLen = $woffLen|0;
 $major = $major|0;
 $minor = $minor|0;
 $pStatus = $pStatus|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $status$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($pStatus|0)!=(0|0);
 if ($0) {
  $1 = HEAP32[$pStatus>>2]|0;
  $2 = $1 & 255;
  $3 = ($2|0)==(0);
  if (!($3)) {
   STACKTOP = sp;return;
  }
 }
 $4 = (_sanityCheck($woffData,$woffLen)|0);
 $5 = $4 & 255;
 $6 = ($5|0)==(0);
 do {
  if ($6) {
   $7 = ($major|0)!=(0|0);
   $8 = ($minor|0)!=(0|0);
   $or$cond = $7 & $8;
   if ($or$cond) {
    HEAP16[$minor>>1] = 0;
    HEAP16[$major>>1] = 0;
    $10 = (($woffData) + 20|0);
    $11 = HEAP8[$10>>0]|0;
    $12 = $11&255;
    $13 = $12 << 8;
    $14 = (($woffData) + 21|0);
    $15 = HEAP8[$14>>0]|0;
    $16 = $15&255;
    $17 = $13 | $16;
    $18 = $17&65535;
    HEAP16[$major>>1] = $18;
    $19 = (($woffData) + 22|0);
    $20 = HEAP8[$19>>0]|0;
    $21 = $20&255;
    $22 = $21 << 8;
    $23 = (($woffData) + 23|0);
    $24 = HEAP8[$23>>0]|0;
    $25 = $24&255;
    $26 = $22 | $25;
    $27 = $26&65535;
    HEAP16[$minor>>1] = $27;
    $status$0 = $4;
    break;
   } else {
    $9 = $4 | 6;
    $status$0 = $9;
    break;
   }
  } else {
   $status$0 = $4;
  }
 } while(0);
 if (!($0)) {
  STACKTOP = sp;return;
 }
 HEAP32[$pStatus>>2] = $status$0;
 STACKTOP = sp;return;
}
function _woffPrintStatus($f,$status,$prefix) {
 $f = $f|0;
 $status = $status|0;
 $prefix = $prefix|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $msg$0 = 0, $prefix$ = 0, $vararg_buffer22 = 0, $vararg_ptr1 = 0, $vararg_ptr13 = 0;
 var $vararg_ptr17 = 0, $vararg_ptr21 = 0, $vararg_ptr25 = 0, $vararg_ptr5 = 0, $vararg_ptr9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $vararg_buffer22 = sp;
 $0 = ($prefix|0)!=(0|0);
 $prefix$ = $0 ? $prefix : 8;
 $1 = ($status>>>0)>(255);
 if ($1) {
  $2 = $status & 256;
  $3 = ($2|0)==(0);
  if (!($3)) {
   HEAP32[$vararg_buffer22>>2] = $prefix$;
   $vararg_ptr1 = (($vararg_buffer22) + 4|0);
   HEAP32[$vararg_ptr1>>2] = 40;
   (_fprintf(($f|0),(16|0),($vararg_buffer22|0))|0);
  }
  $4 = $status & 512;
  $5 = ($4|0)==(0);
  if (!($5)) {
   HEAP32[$vararg_buffer22>>2] = $prefix$;
   $vararg_ptr5 = (($vararg_buffer22) + 4|0);
   HEAP32[$vararg_ptr5>>2] = 72;
   (_fprintf(($f|0),(16|0),($vararg_buffer22|0))|0);
  }
  $6 = $status & 1024;
  $7 = ($6|0)==(0);
  if (!($7)) {
   HEAP32[$vararg_buffer22>>2] = $prefix$;
   $vararg_ptr9 = (($vararg_buffer22) + 4|0);
   HEAP32[$vararg_ptr9>>2] = 104;
   (_fprintf(($f|0),(16|0),($vararg_buffer22|0))|0);
  }
  $8 = $status & 2048;
  $9 = ($8|0)==(0);
  if (!($9)) {
   HEAP32[$vararg_buffer22>>2] = $prefix$;
   $vararg_ptr13 = (($vararg_buffer22) + 4|0);
   HEAP32[$vararg_ptr13>>2] = 128;
   (_fprintf(($f|0),(16|0),($vararg_buffer22|0))|0);
  }
  $10 = $status & 4096;
  $11 = ($10|0)==(0);
  if (!($11)) {
   HEAP32[$vararg_buffer22>>2] = $prefix$;
   $vararg_ptr17 = (($vararg_buffer22) + 4|0);
   HEAP32[$vararg_ptr17>>2] = 160;
   (_fprintf(($f|0),(16|0),($vararg_buffer22|0))|0);
  }
  $12 = $status & 8192;
  $13 = ($12|0)==(0);
  if (!($13)) {
   HEAP32[$vararg_buffer22>>2] = $prefix$;
   $vararg_ptr21 = (($vararg_buffer22) + 4|0);
   HEAP32[$vararg_ptr21>>2] = 200;
   (_fprintf(($f|0),(16|0),($vararg_buffer22|0))|0);
  }
 }
 $14 = $status & 255;
 switch ($14|0) {
 case 0:  {
  STACKTOP = sp;return;
  break;
 }
 case 2:  {
  $msg$0 = 296;
  break;
 }
 case 3:  {
  $msg$0 = 320;
  break;
 }
 case 4:  {
  $msg$0 = 360;
  break;
 }
 case 5:  {
  $msg$0 = 392;
  break;
 }
 case 6:  {
  $msg$0 = 416;
  break;
 }
 case 7:  {
  $msg$0 = 448;
  break;
 }
 case 1:  {
  $msg$0 = 264;
  break;
 }
 default: {
  $msg$0 = 480;
 }
 }
 HEAP32[$vararg_buffer22>>2] = $prefix$;
 $vararg_ptr25 = (($vararg_buffer22) + 4|0);
 HEAP32[$vararg_ptr25>>2] = $msg$0;
 (_fprintf(($f|0),(240|0),($vararg_buffer22|0))|0);
 STACKTOP = sp;return;
}
function _compareOffsets($lhs,$rhs) {
 $lhs = $lhs|0;
 $rhs = $rhs|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAPU8[$lhs>>0]|(HEAPU8[$lhs+1>>0]<<8)|(HEAPU8[$lhs+2>>0]<<16)|(HEAPU8[$lhs+3>>0]<<24);
 $1 = HEAPU8[$rhs>>0]|(HEAPU8[$rhs+1>>0]<<8)|(HEAPU8[$rhs+2>>0]<<16)|(HEAPU8[$rhs+3>>0]<<24);
 $2 = ($0>>>0)>($1>>>0);
 if ($2) {
  $5 = 1;
  STACKTOP = sp;return ($5|0);
 }
 $3 = ($0>>>0)<($1>>>0);
 $4 = $3 << 31 >> 31;
 $5 = $4;
 STACKTOP = sp;return ($5|0);
}
function _sanityCheck($woffData,$woffLen) {
 $woffData = $woffData|0;
 $woffLen = $woffLen|0;
 var $$ = 0, $$0 = 0, $$lcssa = 0, $$not = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0;
 var $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0;
 var $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0;
 var $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0;
 var $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0;
 var $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0;
 var $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $dirEntry$06 = 0, $i$08 = 0, $or$cond = 0, $or$cond2 = 0, $or$cond4 = 0, $tableTotal$0$lcssa9 = 0, $tableTotal$07 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($woffData|0)!=(0|0);
 $1 = ($woffLen|0)!=(0);
 $or$cond = $0 & $1;
 if (!($or$cond)) {
  $$0 = 6;
  STACKTOP = sp;return ($$0|0);
 }
 $2 = ($woffLen>>>0)<(44);
 if ($2) {
  $$0 = 2;
  STACKTOP = sp;return ($$0|0);
 }
 $3 = HEAP8[$woffData>>0]|0;
 $4 = $3&255;
 $5 = $4 << 24;
 $6 = (($woffData) + 1|0);
 $7 = HEAP8[$6>>0]|0;
 $8 = $7&255;
 $9 = $8 << 16;
 $10 = $9 | $5;
 $11 = (($woffData) + 2|0);
 $12 = HEAP8[$11>>0]|0;
 $13 = $12&255;
 $14 = $13 << 8;
 $15 = $10 | $14;
 $16 = (($woffData) + 3|0);
 $17 = HEAP8[$16>>0]|0;
 $18 = $17&255;
 $19 = $15 | $18;
 $20 = ($19|0)==(2001684038);
 if (!($20)) {
  $$0 = 4;
  STACKTOP = sp;return ($$0|0);
 }
 $21 = (($woffData) + 8|0);
 $22 = HEAP8[$21>>0]|0;
 $23 = $22&255;
 $24 = $23 << 24;
 $25 = (($woffData) + 9|0);
 $26 = HEAP8[$25>>0]|0;
 $27 = $26&255;
 $28 = $27 << 16;
 $29 = $28 | $24;
 $30 = (($woffData) + 10|0);
 $31 = HEAP8[$30>>0]|0;
 $32 = $31&255;
 $33 = $32 << 8;
 $34 = $29 | $33;
 $35 = (($woffData) + 11|0);
 $36 = HEAP8[$35>>0]|0;
 $37 = $36&255;
 $38 = $34 | $37;
 $39 = ($38|0)==($woffLen|0);
 if (!($39)) {
  $$0 = 2;
  STACKTOP = sp;return ($$0|0);
 }
 $40 = (($woffData) + 14|0);
 $41 = HEAPU8[$40>>0]|(HEAPU8[$40+1>>0]<<8);
 $42 = ($41<<16>>16)==(0);
 if (!($42)) {
  $$0 = 2;
  STACKTOP = sp;return ($$0|0);
 }
 $43 = (($woffData) + 12|0);
 $44 = HEAP8[$43>>0]|0;
 $45 = $44&255;
 $46 = $45 << 8;
 $47 = (($woffData) + 13|0);
 $48 = HEAP8[$47>>0]|0;
 $49 = $48&255;
 $50 = $46 | $49;
 $51 = ($50*20)|0;
 $52 = (($51) + 44)|0;
 $53 = ($52>>>0)>($woffLen>>>0);
 if ($53) {
  $$0 = 2;
  STACKTOP = sp;return ($$0|0);
 }
 $54 = ($50|0)==(0);
 if ($54) {
  $55 = $50 << 4;
  $146 = $55;$tableTotal$0$lcssa9 = 0;
  $127 = (($woffData) + 16|0);
  $128 = HEAP8[$127>>0]|0;
  $129 = $128&255;
  $130 = $129 << 24;
  $131 = (($woffData) + 17|0);
  $132 = HEAP8[$131>>0]|0;
  $133 = $132&255;
  $134 = $133 << 16;
  $135 = $134 | $130;
  $136 = (($woffData) + 18|0);
  $137 = HEAP8[$136>>0]|0;
  $138 = $137&255;
  $139 = $138 << 8;
  $140 = $135 | $139;
  $141 = (($woffData) + 19|0);
  $142 = HEAP8[$141>>0]|0;
  $143 = $142&255;
  $144 = $140 | $143;
  $145 = $146 | 12;
  $147 = (($145) + ($tableTotal$0$lcssa9))|0;
  $148 = ($144|0)==($147|0);
  $$ = $148 ? 0 : 2;
  STACKTOP = sp;return ($$|0);
 }
 $56 = (($woffData) + 44|0);
 $dirEntry$06 = $56;$i$08 = 0;$tableTotal$07 = 0;
 while(1) {
  $57 = (($dirEntry$06) + 4|0);
  $58 = HEAP8[$57>>0]|0;
  $59 = $58&255;
  $60 = $59 << 24;
  $61 = (($57) + 1|0);
  $62 = HEAP8[$61>>0]|0;
  $63 = $62&255;
  $64 = $63 << 16;
  $65 = $64 | $60;
  $66 = (($57) + 2|0);
  $67 = HEAP8[$66>>0]|0;
  $68 = $67&255;
  $69 = $68 << 8;
  $70 = $65 | $69;
  $71 = (($57) + 3|0);
  $72 = HEAP8[$71>>0]|0;
  $73 = $72&255;
  $74 = $70 | $73;
  $75 = (($dirEntry$06) + 12|0);
  $76 = HEAP8[$75>>0]|0;
  $77 = $76&255;
  $78 = $77 << 24;
  $79 = (($75) + 1|0);
  $80 = HEAP8[$79>>0]|0;
  $81 = $80&255;
  $82 = $81 << 16;
  $83 = $82 | $78;
  $84 = (($75) + 2|0);
  $85 = HEAP8[$84>>0]|0;
  $86 = $85&255;
  $87 = $86 << 8;
  $88 = $83 | $87;
  $89 = (($75) + 3|0);
  $90 = HEAP8[$89>>0]|0;
  $91 = $90&255;
  $92 = $88 | $91;
  $93 = (($dirEntry$06) + 8|0);
  $94 = HEAP8[$93>>0]|0;
  $95 = $94&255;
  $96 = $95 << 24;
  $97 = (($93) + 1|0);
  $98 = HEAP8[$97>>0]|0;
  $99 = $98&255;
  $100 = $99 << 16;
  $101 = $100 | $96;
  $102 = (($93) + 2|0);
  $103 = HEAP8[$102>>0]|0;
  $104 = $103&255;
  $105 = $104 << 8;
  $106 = $101 | $105;
  $107 = (($93) + 3|0);
  $108 = HEAP8[$107>>0]|0;
  $109 = $108&255;
  $110 = $106 | $109;
  $111 = ($110>>>0)>($92>>>0);
  $112 = ($110>>>0)>($woffLen>>>0);
  $or$cond2 = $111 | $112;
  $113 = (($woffLen) - ($110))|0;
  $114 = ($74>>>0)>($113>>>0);
  $or$cond4 = $or$cond2 | $114;
  if ($or$cond4) {
   $$0 = 2;
   label = 15;
   break;
  }
  $115 = (($92) + 3)|0;
  $$not = $115 | 3;
  $116 = $$not ^ -4;
  $117 = ($tableTotal$07>>>0)>($116>>>0);
  if ($117) {
   $$0 = 2;
   label = 15;
   break;
  }
  $118 = $115 & -4;
  $119 = (($118) + ($tableTotal$07))|0;
  $120 = (($dirEntry$06) + 20|0);
  $121 = (($i$08) + 1)<<16>>16;
  $122 = $121&65535;
  $123 = ($122>>>0)<($50>>>0);
  if ($123) {
   $dirEntry$06 = $120;$i$08 = $121;$tableTotal$07 = $119;
  } else {
   $$lcssa = $119;
   label = 13;
   break;
  }
 }
 if ((label|0) == 13) {
  $124 = $50 << 4;
  $125 = (-13 - ($124))|0;
  $126 = ($$lcssa>>>0)>($125>>>0);
  if ($126) {
   $$0 = 2;
   STACKTOP = sp;return ($$0|0);
  } else {
   $146 = $124;$tableTotal$0$lcssa9 = $$lcssa;
   $127 = (($woffData) + 16|0);
   $128 = HEAP8[$127>>0]|0;
   $129 = $128&255;
   $130 = $129 << 24;
   $131 = (($woffData) + 17|0);
   $132 = HEAP8[$131>>0]|0;
   $133 = $132&255;
   $134 = $133 << 16;
   $135 = $134 | $130;
   $136 = (($woffData) + 18|0);
   $137 = HEAP8[$136>>0]|0;
   $138 = $137&255;
   $139 = $138 << 8;
   $140 = $135 | $139;
   $141 = (($woffData) + 19|0);
   $142 = HEAP8[$141>>0]|0;
   $143 = $142&255;
   $144 = $140 | $143;
   $145 = $146 | 12;
   $147 = (($145) + ($tableTotal$0$lcssa9))|0;
   $148 = ($144|0)==($147|0);
   $$ = $148 ? 0 : 2;
   STACKTOP = sp;return ($$|0);
  }
 }
 else if ((label|0) == 15) {
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function _woffDecodeToBufferInternal($woffData,$sfntData,$pActualSfntLen,$pStatus) {
 $woffData = $woffData|0;
 $sfntData = $sfntData|0;
 $pActualSfntLen = $pActualSfntLen|0;
 $pStatus = $pStatus|0;
 var $$lcssa = 0, $$lcssa100 = 0, $$lcssa102 = 0, $$lcssa104 = 0, $$lcssa94 = 0, $$lcssa98 = 0, $$pre = 0, $$pre$phi87Z2D = 0, $$pre78 = 0, $$pre80 = 0, $$pre82 = 0, $$pre84 = 0, $$pre86 = 0, $$sum = 0, $$sum2 = 0, $$sum3 = 0, $$sum4 = 0, $0 = 0, $1 = 0, $10 = 0;
 var $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0;
 var $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0;
 var $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0;
 var $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0;
 var $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0;
 var $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0;
 var $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0;
 var $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0;
 var $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0;
 var $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0;
 var $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0;
 var $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0;
 var $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0;
 var $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0;
 var $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, $csum$sroa$0$040 = 0, $csum$sroa$0$120 = 0, $csum$sroa$10$038 = 0, $csum$sroa$10$118 = 0, $csum$sroa$11$037 = 0, $csum$sroa$11$117 = 0, $csum$sroa$9$039 = 0, $csum$sroa$9$119 = 0, $csumPtr$021 = 0, $destLen = 0, $entrySelector$sroa$0$0$lcssa = 0, $entrySelector$sroa$0$054 = 0, $entrySelector$sroa$4$0$lcssa = 0, $entrySelector$sroa$4$055 = 0, $headLength$036 = 0, $headLength$1 = 0, $headLength$1$lcssa = 0;
 var $headOffset$035 = 0, $headOffset$1 = 0, $headOffset$1$lcssa = 0, $offset$sroa$0$0$in34 = 0, $offset$sroa$11$0$in33 = 0, $offset$sroa$11$1$in = 0, $offset$sroa$12$032 = 0, $offset$sroa$12$1 = 0, $offset$sroa$12$1$in = 0, $offset$sroa$13$031 = 0, $offset$sroa$13$1$in = 0, $offset$sroa$13$1$in$in$lcssa = 0, $offset$sroa$13$1$in$lcssa = 0, $offset$sroa$13$1$in25 = 0, $or$cond = 0, $or$cond26 = 0, $or$cond8 = 0, $order$041 = 0, $phitmp = 0, $phitmp88 = 0;
 var $phitmp90 = 0, $phitmp92 = 0, $phitmp93 = 0, $status$0 = 0, $status$0$ = 0, $status$2 = 0, $status$3 = 0, $status$310 = 0, $tableIndex$051 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $destLen = sp;
 $0 = ($pStatus|0)!=(0|0);
 if ($0) {
  $1 = HEAP32[$pStatus>>2]|0;
  $2 = $1 & 255;
  $3 = ($2|0)==(0);
  if (!($3)) {
   STACKTOP = sp;return;
  }
 }
 $4 = (($woffData) + 4|0);
 $5 = HEAP8[$4>>0]|0;
 $6 = $5&255;
 $7 = $6 << 24;
 $8 = (($woffData) + 5|0);
 $9 = HEAP8[$8>>0]|0;
 $10 = $9&255;
 $11 = $10 << 16;
 $12 = $11 | $7;
 $13 = (($woffData) + 6|0);
 $14 = HEAP8[$13>>0]|0;
 $15 = $14&255;
 $16 = $15 << 8;
 $17 = $12 | $16;
 $18 = (($woffData) + 7|0);
 $19 = HEAP8[$18>>0]|0;
 $20 = $19&255;
 $21 = $17 | $20;
 if ((($21|0) == 1953658213) | (($21|0) == 1330926671) | (($21|0) == 65536)) {
  $status$0 = 0;
 } else {
  $status$0 = 256;
 }
 $22 = (($woffData) + 12|0);
 $23 = HEAP8[$22>>0]|0;
 $24 = (($woffData) + 13|0);
 $25 = HEAP8[$24>>0]|0;
 $26 = (($woffData) + 44|0);
 $27 = (($woffData) + 16|0);
 $28 = HEAP8[$27>>0]|0;
 $29 = $28&255;
 $30 = $29 << 24;
 $31 = (($woffData) + 17|0);
 $32 = HEAP8[$31>>0]|0;
 $33 = $32&255;
 $34 = $33 << 16;
 $35 = $34 | $30;
 $36 = (($woffData) + 18|0);
 $37 = HEAP8[$36>>0]|0;
 $38 = $37&255;
 $39 = $38 << 8;
 $40 = $35 | $39;
 $41 = (($woffData) + 19|0);
 $42 = HEAP8[$41>>0]|0;
 $43 = $42&255;
 $44 = $40 | $43;
 $45 = HEAPU8[$4>>0]|(HEAPU8[$4+1>>0]<<8)|(HEAPU8[$4+2>>0]<<16)|(HEAPU8[$4+3>>0]<<24);
 HEAP8[$sfntData>>0]=$45&255;HEAP8[$sfntData+1>>0]=($45>>8)&255;HEAP8[$sfntData+2>>0]=($45>>16)&255;HEAP8[$sfntData+3>>0]=$45>>24;
 $46 = $25&255;
 $47 = $46 << 8;
 $48 = $23&255;
 $49 = $47 | $48;
 $50 = $49&65535;
 $51 = (($sfntData) + 4|0);
 HEAP8[$51>>0]=$50&255;HEAP8[$51+1>>0]=$50>>8;
 $52 = $48 << 8;
 $53 = $52 | $46;
 $54 = $53 >>> 1;
 $55 = $54 | $53;
 $56 = $55 >>> 2;
 $57 = $56 | $55;
 $58 = $57 >>> 4;
 $59 = $58 & 4095;
 $60 = $59 | $57;
 $61 = $60 >>> 8;
 $62 = $61 | $60;
 $63 = $62 & 255;
 $64 = $60 & 65280;
 $65 = $63 | $64;
 $66 = $65 >>> 1;
 $67 = $66 ^ 65535;
 $68 = $67 & $65;
 $69 = $68 << 4;
 $70 = $68 >>> 4;
 $71 = $69&65535;
 $72 = $71 & 240;
 $73 = $72&65535;
 $74 = $73 << 8;
 $75 = $70 & 255;
 $76 = $74 | $75;
 $77 = $76&65535;
 $78 = (($sfntData) + 6|0);
 HEAP8[$78>>0]=$77&255;HEAP8[$78+1>>0]=$77>>8;
 $79 = $53 << 4;
 $80 = $70 << 8;
 $81 = $80&65535;
 $82 = $81 | $72;
 $83 = $82&65535;
 $84 = (($79) - ($83))|0;
 $85 = $84 >>> 8;
 $86 = $84 << 8;
 $87 = $86 & 61440;
 $88 = $85 & 255;
 $89 = $87 | $88;
 $90 = $89&65535;
 $91 = (($sfntData) + 10|0);
 HEAP8[$91>>0]=$90&255;HEAP8[$91+1>>0]=$90>>8;
 $92 = $80 & 65280;
 $93 = $69 & 240;
 $94 = $92 | $93;
 $95 = ($94>>>0)>(16);
 if ($95) {
  $101 = $94;$103 = $92;$entrySelector$sroa$0$054 = 0;$entrySelector$sroa$4$055 = 0;
  while(1) {
   $96 = ($entrySelector$sroa$4$055 << 8)&65535;
   $97 = $96 | $entrySelector$sroa$0$054;
   $98 = (($97) + 1)<<16>>16;
   $99 = ($98&65535) >>> 8;
   $100 = $101 >>> 1;
   $phitmp = $98 & 255;
   $102 = $103 >>> 1;
   $104 = $102 & 32512;
   $105 = $100 & 255;
   $106 = $104 | $105;
   $107 = ($106>>>0)>(16);
   if ($107) {
    $101 = $106;$103 = $104;$entrySelector$sroa$0$054 = $phitmp;$entrySelector$sroa$4$055 = $99;
   } else {
    $entrySelector$sroa$0$0$lcssa = $phitmp;$entrySelector$sroa$4$0$lcssa = $99;
    break;
   }
  }
 } else {
  $entrySelector$sroa$0$0$lcssa = 0;$entrySelector$sroa$4$0$lcssa = 0;
 }
 $108 = $entrySelector$sroa$0$0$lcssa&65535;
 $109 = $108 << 8;
 $110 = $entrySelector$sroa$4$0$lcssa&65535;
 $111 = $109 | $110;
 $112 = $111&65535;
 $113 = (($sfntData) + 8|0);
 HEAP8[$113>>0]=$112&255;HEAP8[$113+1>>0]=$112>>8;
 $114 = $53 << 3;
 $115 = (_malloc($114)|0);
 $116 = ($115|0)==(0|0);
 L12: do {
  if ($116) {
   $118 = $status$0 | 1;
   $status$310 = $118;
  } else {
   $117 = ($53|0)==(0);
   L14: do {
    if ($117) {
     _qsort($115,$53,8,1);
     $status$2 = $status$0;
    } else {
     $120 = 0;$tableIndex$051 = 0;
     while(1) {
      $119 = ((($26) + (($120*20)|0)|0) + 4|0);
      $121 = HEAP8[$119>>0]|0;
      $122 = $121&255;
      $123 = $122 << 24;
      $124 = (($119) + 1|0);
      $125 = HEAP8[$124>>0]|0;
      $126 = $125&255;
      $127 = $126 << 16;
      $128 = $127 | $123;
      $129 = (($119) + 2|0);
      $130 = HEAP8[$129>>0]|0;
      $131 = $130&255;
      $132 = $131 << 8;
      $133 = $128 | $132;
      $134 = (($119) + 3|0);
      $135 = HEAP8[$134>>0]|0;
      $136 = $135&255;
      $137 = $133 | $136;
      $138 = (($115) + ($120<<3)|0);
      HEAP8[$138>>0]=$137&255;HEAP8[$138+1>>0]=($137>>8)&255;HEAP8[$138+2>>0]=($137>>16)&255;HEAP8[$138+3>>0]=$137>>24;
      $139 = ((($115) + ($120<<3)|0) + 4|0);
      HEAP8[$139>>0]=$tableIndex$051&255;HEAP8[$139+1>>0]=$tableIndex$051>>8;
      $140 = (($tableIndex$051) + 1)<<16>>16;
      $141 = $140&65535;
      $142 = ($141>>>0)<($53>>>0);
      if ($142) {
       $120 = $141;$tableIndex$051 = $140;
      } else {
       break;
      }
     }
     _qsort($115,$53,8,1);
     $143 = $79 | 12;
     $144 = (($sfntData) + 12|0);
     if ($117) {
      $status$2 = $status$0;
     } else {
      $145 = ($23&255) >>> 4;
      $146 = $53 >>> 4;
      $148 = 0;$csum$sroa$0$040 = 0;$csum$sroa$10$038 = 0;$csum$sroa$11$037 = 0;$csum$sroa$9$039 = 0;$headLength$036 = 0;$headOffset$035 = 0;$offset$sroa$0$0$in34 = $143;$offset$sroa$11$0$in33 = $146;$offset$sroa$12$032 = $145;$offset$sroa$13$031 = 0;$order$041 = 0;
      while(1) {
       $147 = ((($115) + ($148<<3)|0) + 4|0);
       $149 = HEAPU8[$147>>0]|(HEAPU8[$147+1>>0]<<8);
       $150 = $149&65535;
       $151 = ((($26) + (($150*20)|0)|0) + 12|0);
       $152 = HEAP8[$151>>0]|0;
       $153 = $152&255;
       $154 = $153 << 24;
       $155 = (($151) + 1|0);
       $156 = HEAP8[$155>>0]|0;
       $157 = $156&255;
       $158 = $157 << 16;
       $159 = $158 | $154;
       $160 = (($151) + 2|0);
       $161 = HEAP8[$160>>0]|0;
       $162 = $161&255;
       $163 = $162 << 8;
       $164 = $159 | $163;
       $165 = (($151) + 3|0);
       $166 = HEAP8[$165>>0]|0;
       $167 = $166&255;
       $168 = $164 | $167;
       $169 = ((($26) + (($150*20)|0)|0) + 8|0);
       $170 = HEAP8[$169>>0]|0;
       $171 = $170&255;
       $172 = $171 << 24;
       $173 = (($169) + 1|0);
       $174 = HEAP8[$173>>0]|0;
       $175 = $174&255;
       $176 = $175 << 16;
       $177 = $176 | $172;
       $178 = (($169) + 2|0);
       $179 = HEAP8[$178>>0]|0;
       $180 = $179&255;
       $181 = $180 << 8;
       $182 = $177 | $181;
       $183 = (($169) + 3|0);
       $184 = HEAP8[$183>>0]|0;
       $185 = $184&255;
       $186 = $182 | $185;
       $187 = ((($26) + (($150*20)|0)|0) + 4|0);
       $188 = HEAP8[$187>>0]|0;
       $189 = $188&255;
       $190 = $189 << 24;
       $191 = (($187) + 1|0);
       $192 = HEAP8[$191>>0]|0;
       $193 = $192&255;
       $194 = $193 << 16;
       $195 = $194 | $190;
       $196 = (($187) + 2|0);
       $197 = HEAP8[$196>>0]|0;
       $198 = $197&255;
       $199 = $198 << 8;
       $200 = $195 | $199;
       $201 = (($187) + 3|0);
       $202 = HEAP8[$201>>0]|0;
       $203 = $202&255;
       $204 = $200 | $203;
       $205 = (($26) + (($150*20)|0)|0);
       $206 = HEAPU8[$205>>0]|(HEAPU8[$205+1>>0]<<8)|(HEAPU8[$205+2>>0]<<16)|(HEAPU8[$205+3>>0]<<24);
       $207 = (($144) + ($150<<4)|0);
       HEAP8[$207>>0]=$206&255;HEAP8[$207+1>>0]=($206>>8)&255;HEAP8[$207+2>>0]=($206>>16)&255;HEAP8[$207+3>>0]=$206>>24;
       $208 = $offset$sroa$0$0$in34 & 255;
       $209 = $208 << 24;
       $210 = $offset$sroa$11$0$in33 & 255;
       $211 = $210 << 16;
       $212 = $offset$sroa$12$032&255;
       $213 = $212 << 8;
       $214 = $213 | $offset$sroa$13$031;
       $215 = $214 | $211;
       $216 = $215 | $209;
       $217 = ((($144) + ($150<<4)|0) + 8|0);
       HEAP8[$217>>0]=$216&255;HEAP8[$217+1>>0]=($216>>8)&255;HEAP8[$217+2>>0]=($216>>16)&255;HEAP8[$217+3>>0]=$216>>24;
       $218 = HEAPU8[$151>>0]|(HEAPU8[$151+1>>0]<<8)|(HEAPU8[$151+2>>0]<<16)|(HEAPU8[$151+3>>0]<<24);
       $219 = ((($144) + ($150<<4)|0) + 12|0);
       HEAP8[$219>>0]=$218&255;HEAP8[$219+1>>0]=($218>>8)&255;HEAP8[$219+2>>0]=($218>>16)&255;HEAP8[$219+3>>0]=$218>>24;
       $220 = ((($26) + (($150*20)|0)|0) + 16|0);
       $221 = HEAPU8[$220>>0]|(HEAPU8[$220+1>>0]<<8)|(HEAPU8[$220+2>>0]<<16)|(HEAPU8[$220+3>>0]<<24);
       $222 = ((($144) + ($150<<4)|0) + 4|0);
       HEAP8[$222>>0]=$221&255;HEAP8[$222+1>>0]=($221>>8)&255;HEAP8[$222+2>>0]=($221>>16)&255;HEAP8[$222+3>>0]=$221>>24;
       $223 = (_llvm_bswap_i32(($221|0))|0);
       $224 = $csum$sroa$11$037 << 24;
       $225 = $csum$sroa$10$038 << 16;
       $226 = $225 & 16711680;
       $227 = $226 | $224;
       $228 = $csum$sroa$9$039 << 8;
       $229 = $228 & 65280;
       $230 = $227 | $229;
       $231 = $csum$sroa$0$040 & 255;
       $232 = $230 | $231;
       $233 = (($223) + ($232))|0;
       $234 = $233 >>> 8;
       $235 = $233 >>> 16;
       $236 = $233 >>> 24;
       $237 = ($186>>>0)<($168>>>0);
       if ($237) {
        HEAP32[$destLen>>2] = $168;
        $238 = $offset$sroa$13$031 << 24;
        $239 = $212 << 16;
        $240 = $239 | $238;
        $241 = $210 << 8;
        $242 = $240 | $241;
        $243 = $242 | $208;
        $244 = (($sfntData) + ($243)|0);
        $245 = (($woffData) + ($204)|0);
        $246 = (_uncompress(($244|0),($destLen|0),($245|0),($186|0))|0);
        $247 = ($246|0)==(0);
        $248 = HEAP32[$destLen>>2]|0;
        $249 = ($248|0)==($168|0);
        $or$cond8 = $247 & $249;
        if (!($or$cond8)) {
         label = 16;
         break;
        }
       } else {
        $251 = $offset$sroa$13$031 << 24;
        $252 = $212 << 16;
        $253 = $252 | $251;
        $254 = $210 << 8;
        $255 = $253 | $254;
        $256 = $255 | $208;
        $257 = (($sfntData) + ($256)|0);
        $258 = (($woffData) + ($204)|0);
        _memcpy(($257|0),($258|0),($168|0))|0;
       }
       $259 = HEAP8[$207>>0]|0;
       $260 = $259&255;
       $261 = $260 << 24;
       $262 = (($207) + 1|0);
       $263 = HEAP8[$262>>0]|0;
       $264 = $263&255;
       $265 = $264 << 16;
       $266 = $265 | $261;
       $267 = (($207) + 2|0);
       $268 = HEAP8[$267>>0]|0;
       $269 = $268&255;
       $270 = $269 << 8;
       $271 = $266 | $270;
       $272 = (($207) + 3|0);
       $273 = HEAP8[$272>>0]|0;
       $274 = $273&255;
       $275 = $271 | $274;
       if ((($275|0) == 1651008868) | (($275|0) == 1751474532)) {
        $276 = $offset$sroa$13$031 << 24;
        $277 = $212 << 16;
        $278 = $277 | $276;
        $279 = $210 << 8;
        $280 = $278 | $279;
        $281 = $280 | $208;
        $$pre$phi87Z2D = $281;$headLength$1 = $168;$headOffset$1 = $281;
       } else {
        $$pre = $offset$sroa$13$031 << 24;
        $$pre78 = $212 << 16;
        $$pre80 = $$pre78 | $$pre;
        $$pre82 = $210 << 8;
        $$pre84 = $$pre80 | $$pre82;
        $$pre86 = $$pre84 | $208;
        $$pre$phi87Z2D = $$pre86;$headLength$1 = $headLength$036;$headOffset$1 = $headOffset$035;
       }
       $282 = (($168) + ($$pre$phi87Z2D))|0;
       $offset$sroa$13$1$in25 = $282 >>> 24;
       $283 = $offset$sroa$13$1$in25 << 24;
       $284 = $282 & 16777215;
       $285 = $284 | $283;
       $286 = ($285>>>0)>=($44>>>0);
       $287 = $282 & 3;
       $288 = ($287|0)==(0);
       $or$cond26 = $286 | $288;
       if ($or$cond26) {
        $offset$sroa$13$1$in$in$lcssa = $282;$offset$sroa$13$1$in$lcssa = $offset$sroa$13$1$in25;
       } else {
        $290 = $285;
        while(1) {
         $289 = (($290) + 1)|0;
         $291 = (($sfntData) + ($290)|0);
         HEAP8[$291>>0] = 0;
         $offset$sroa$13$1$in = $289 >>> 24;
         $292 = $offset$sroa$13$1$in << 24;
         $293 = $289 & 16777215;
         $294 = $293 | $292;
         $295 = ($294>>>0)>=($44>>>0);
         $296 = $289 & 3;
         $297 = ($296|0)==(0);
         $or$cond = $295 | $297;
         if ($or$cond) {
          $offset$sroa$13$1$in$in$lcssa = $289;$offset$sroa$13$1$in$lcssa = $offset$sroa$13$1$in;
          break;
         } else {
          $290 = $294;
         }
        }
       }
       $offset$sroa$12$1$in = $offset$sroa$13$1$in$in$lcssa >>> 16;
       $offset$sroa$12$1 = $offset$sroa$12$1$in&255;
       $offset$sroa$11$1$in = $offset$sroa$13$1$in$in$lcssa >>> 8;
       $298 = (($order$041) + 1)<<16>>16;
       $299 = $298&65535;
       $300 = ($299>>>0)<($53>>>0);
       if ($300) {
        $148 = $299;$csum$sroa$0$040 = $233;$csum$sroa$10$038 = $235;$csum$sroa$11$037 = $236;$csum$sroa$9$039 = $234;$headLength$036 = $headLength$1;$headOffset$035 = $headOffset$1;$offset$sroa$0$0$in34 = $offset$sroa$13$1$in$in$lcssa;$offset$sroa$11$0$in33 = $offset$sroa$11$1$in;$offset$sroa$12$032 = $offset$sroa$12$1;$offset$sroa$13$031 = $offset$sroa$13$1$in$lcssa;$order$041 = $298;
       } else {
        $$lcssa100 = $234;$$lcssa102 = $235;$$lcssa104 = $236;$$lcssa98 = $233;$headLength$1$lcssa = $headLength$1;$headOffset$1$lcssa = $headOffset$1;
        label = 24;
        break;
       }
      }
      do {
       if ((label|0) == 16) {
        $250 = $status$0 | 3;
        $status$3 = $250;
       }
       else if ((label|0) == 24) {
        $301 = ($headOffset$1$lcssa|0)==(0);
        if ($301) {
         $status$2 = $status$0;
         break L14;
        }
        $302 = ($headLength$1$lcssa>>>0)<(54);
        if ($302) {
         $303 = $status$0 | 2;
         $status$3 = $303;
         break;
        }
        $$sum = (($headOffset$1$lcssa) + 8)|0;
        $304 = (($sfntData) + ($$sum)|0);
        $305 = HEAP8[$304>>0]|0;
        $306 = $305&255;
        $307 = $306 << 24;
        $$sum2 = (($headOffset$1$lcssa) + 9)|0;
        $308 = (($sfntData) + ($$sum2)|0);
        $309 = HEAP8[$308>>0]|0;
        $310 = $309&255;
        $311 = $310 << 16;
        $312 = $311 | $307;
        $$sum3 = (($headOffset$1$lcssa) + 10)|0;
        $313 = (($sfntData) + ($$sum3)|0);
        $314 = HEAP8[$313>>0]|0;
        $315 = $314&255;
        $316 = $315 << 8;
        $317 = $312 | $316;
        $$sum4 = (($headOffset$1$lcssa) + 11)|0;
        $318 = (($sfntData) + ($$sum4)|0);
        $319 = HEAP8[$318>>0]|0;
        $320 = $319&255;
        $321 = $317 | $320;
        HEAP8[$304>>0]=0&255;HEAP8[$304+1>>0]=(0>>8)&255;HEAP8[$304+2>>0]=(0>>16)&255;HEAP8[$304+3>>0]=0>>24;
        $322 = (($sfntData) + ($143)|0);
        $csum$sroa$0$120 = $$lcssa98;$csum$sroa$10$118 = $$lcssa102;$csum$sroa$11$117 = $$lcssa104;$csum$sroa$9$119 = $$lcssa100;$csumPtr$021 = $sfntData;
        while(1) {
         $323 = HEAP8[$csumPtr$021>>0]|0;
         $324 = $323&255;
         $325 = $324 << 24;
         $326 = (($csumPtr$021) + 1|0);
         $327 = HEAP8[$326>>0]|0;
         $328 = $327&255;
         $329 = $328 << 16;
         $330 = $329 | $325;
         $331 = (($csumPtr$021) + 2|0);
         $332 = HEAP8[$331>>0]|0;
         $333 = $332&255;
         $334 = $333 << 8;
         $335 = $330 | $334;
         $336 = (($csumPtr$021) + 3|0);
         $337 = HEAP8[$336>>0]|0;
         $338 = $337&255;
         $339 = $335 | $338;
         $340 = $csum$sroa$11$117 << 24;
         $341 = $csum$sroa$10$118 << 16;
         $342 = $341 & 16711680;
         $343 = $342 | $340;
         $344 = $csum$sroa$9$119 << 8;
         $345 = $344 & 65280;
         $346 = $343 | $345;
         $347 = $csum$sroa$0$120 & 255;
         $348 = $346 | $347;
         $349 = (($339) + ($348))|0;
         $350 = $349 >>> 8;
         $351 = $349 >>> 16;
         $352 = $349 >>> 24;
         $353 = (($csumPtr$021) + 4|0);
         $354 = ($353>>>0)<($322>>>0);
         if ($354) {
          $csum$sroa$0$120 = $349;$csum$sroa$10$118 = $351;$csum$sroa$11$117 = $352;$csum$sroa$9$119 = $350;$csumPtr$021 = $353;
         } else {
          $$lcssa = $349;$$lcssa94 = $352;
          break;
         }
        }
        $phitmp88 = $$lcssa94 << 24;
        $phitmp90 = $$lcssa & 16711680;
        $phitmp92 = $$lcssa & 65280;
        $phitmp93 = $$lcssa & 255;
        $355 = $phitmp90 | $phitmp88;
        $356 = $355 | $phitmp92;
        $357 = $356 | $phitmp93;
        $358 = (-1313820742 - ($357))|0;
        $359 = ($321|0)==($358|0);
        $360 = $status$0 | 512;
        $status$0$ = $359 ? $status$0 : $360;
        $361 = (_llvm_bswap_i32(($358|0))|0);
        HEAP8[$304>>0]=$361&255;HEAP8[$304+1>>0]=($361>>8)&255;HEAP8[$304+2>>0]=($361>>16)&255;HEAP8[$304+3>>0]=$361>>24;
        $status$2 = $status$0$;
        break L14;
       }
      } while(0);
      _free($115);
      $status$310 = $status$3;
      break L12;
     }
    }
   } while(0);
   $362 = ($pActualSfntLen|0)==(0|0);
   if (!($362)) {
    HEAP32[$pActualSfntLen>>2] = $44;
   }
   if ($0) {
    $363 = HEAP32[$pStatus>>2]|0;
    $364 = $363 | $status$2;
    HEAP32[$pStatus>>2] = $364;
   }
   _free($115);
   STACKTOP = sp;return;
  }
 } while(0);
 $365 = ($pActualSfntLen|0)==(0|0);
 if (!($365)) {
  HEAP32[$pActualSfntLen>>2] = 0;
 }
 if (!($0)) {
  STACKTOP = sp;return;
 }
 HEAP32[$pStatus>>2] = $status$310;
 STACKTOP = sp;return;
}
function _readFile($name,$len) {
 $name = $name|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $buf = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0;
 $vararg_buffer = sp;
 $buf = sp + 8|0;
 $0 = (_fopen(($name|0),(504|0))|0);
 $1 = ($0|0)==(0|0);
 if ($1) {
  HEAP32[$vararg_buffer>>2] = $name;
  (_sprintf($buf,512,$vararg_buffer)|0);
  _die($buf);
  // unreachable;
 }
 $2 = (_fseek(($0|0),0,2)|0);
 $3 = ($2|0)==(0);
 if (!($3)) {
  _die(536);
  // unreachable;
 }
 $4 = (_ftell(($0|0))|0);
 HEAP32[$len>>2] = $4;
 $5 = (_fseek(($0|0),0,0)|0);
 $6 = ($5|0)==(0);
 if (!($6)) {
  _die(536);
  // unreachable;
 }
 $7 = HEAP32[$len>>2]|0;
 $8 = (_malloc($7)|0);
 $9 = ($8|0)==(0|0);
 if ($9) {
  _die(552);
  // unreachable;
 }
 $10 = (_fread(($8|0),1,($7|0),($0|0))|0);
 $11 = HEAP32[$len>>2]|0;
 $12 = ($10|0)==($11|0);
 if ($12) {
  (_fclose(($0|0))|0);
  STACKTOP = sp;return ($8|0);
 } else {
  _die(568);
  // unreachable;
 }
 return (0)|0;
}
function _main($argc,$argv) {
 $argc = $argc|0;
 $argv = $argv|0;
 var $$lcssa18 = 0, $$lcssa19 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $len = 0, $maj = 0, $min = 0, $option$0$ph = 0;
 var $option$0$ph$lcssa = 0, $option$0$ph11 = 0, $status = 0, $vararg_buffer22 = 0, $vararg_ptr12 = 0, $vararg_ptr25 = 0, $vararg_ptr4 = 0, $vararg_ptr8 = 0, $woffLen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $vararg_buffer22 = sp;
 $status = sp + 16|0;
 $woffLen = sp + 12|0;
 $len = sp + 8|0;
 $maj = sp + 22|0;
 $min = sp + 20|0;
 $0 = HEAP32[$argv>>2]|0;
 HEAP32[$status>>2] = 0;
 $1 = HEAP32[_stderr>>2]|0;
 $option$0$ph = 0;
 L1: while(1) {
  $2 = ($option$0$ph|0)==(0);
  if (!($2)) {
   $option$0$ph$lcssa = $option$0$ph;
   label = 3;
   break;
  }
  L3: while(1) {
   $3 = (_getopt($argc,$argv,592)|0);
   switch ($3|0) {
   case 112:  {
    $option$0$ph = 112;
    continue L1;
    break;
   }
   case 118:  {
    $$lcssa18 = $3;
    label = 6;
    break L3;
    break;
   }
   case -1:  {
    $option$0$ph11 = 0;
    break L1;
    break;
   }
   case 109:  {
    $$lcssa19 = $3;
    label = 5;
    break L3;
    break;
   }
   case 63: case 104:  {
    label = 12;
    break L1;
    break;
   }
   default: {
   }
   }
   HEAP32[$vararg_buffer22>>2] = $3;
   (_fprintf(($1|0),(648|0),($vararg_buffer22|0))|0);
  }
  if ((label|0) == 5) {
   label = 0;
   $option$0$ph = $$lcssa19;
   continue;
  }
  else if ((label|0) == 6) {
   label = 0;
   $option$0$ph = $$lcssa18;
   continue;
  }
 }
 if ((label|0) == 12) {
  HEAP32[$vararg_buffer22>>2] = $0;
  (_fprintf(($1|0),(840|0),($vararg_buffer22|0))|0);
  _exit(0);
  // unreachable;
 }
 L11: do {
  if ((label|0) == 3) {
   L13: while(1) {
    $4 = (_getopt($argc,$argv,592)|0);
    switch ($4|0) {
    case 109:  {
     HEAP32[$vararg_buffer22>>2] = 109;
     $vararg_ptr8 = (($vararg_buffer22) + 4|0);
     HEAP32[$vararg_ptr8>>2] = $option$0$ph$lcssa;
     (_fprintf(($1|0),(600|0),($vararg_buffer22|0))|0);
     continue L13;
     break;
    }
    case -1:  {
     $option$0$ph11 = $option$0$ph$lcssa;
     break L11;
     break;
    }
    case 118:  {
     HEAP32[$vararg_buffer22>>2] = 118;
     $vararg_ptr4 = (($vararg_buffer22) + 4|0);
     HEAP32[$vararg_ptr4>>2] = $option$0$ph$lcssa;
     (_fprintf(($1|0),(600|0),($vararg_buffer22|0))|0);
     continue L13;
     break;
    }
    case 112:  {
     HEAP32[$vararg_buffer22>>2] = 112;
     $vararg_ptr12 = (($vararg_buffer22) + 4|0);
     HEAP32[$vararg_ptr12>>2] = $option$0$ph$lcssa;
     (_fprintf(($1|0),(600|0),($vararg_buffer22|0))|0);
     continue L13;
     break;
    }
    case 63: case 104:  {
     break L13;
     break;
    }
    default: {
     HEAP32[$vararg_buffer22>>2] = $4;
     (_fprintf(($1|0),(648|0),($vararg_buffer22|0))|0);
     continue L13;
    }
    }
   }
   HEAP32[$vararg_buffer22>>2] = $0;
   (_fprintf(($1|0),(840|0),($vararg_buffer22|0))|0);
   _exit(0);
   // unreachable;
  }
 } while(0);
 $5 = HEAP32[1232>>2]|0;
 $6 = (($argc) - ($5))|0;
 $7 = ($6|0)==(1);
 if (!($7)) {
  HEAP32[$vararg_buffer22>>2] = $0;
  (_fprintf(($1|0),(840|0),($vararg_buffer22|0))|0);
  _exit(1);
  // unreachable;
 }
 $8 = (($argv) + ($5<<2)|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = (_readFile($9,$woffLen)|0);
 do {
  if ((($option$0$ph11|0) == 109)) {
   $19 = HEAP32[$woffLen>>2]|0;
   $20 = (_woffGetMetadata($10,$19,$len,$status)|0);
   $21 = HEAP32[$status>>2]|0;
   $22 = $21 & 255;
   $23 = ($22|0)==(0);
   if (!($23)) {
    _reportErr($21);
    // unreachable;
   }
   $24 = ($20|0)==(0|0);
   if ($24) {
    (_puts((1192|0))|0);
    break;
   }
   $25 = HEAP32[$len>>2]|0;
   $26 = HEAP32[_stdout>>2]|0;
   $27 = (_fwrite(($20|0),1,($25|0),($26|0))|0);
   $28 = HEAP32[$len>>2]|0;
   $29 = ($27|0)==($28|0);
   if ($29) {
    _free($20);
    break;
   } else {
    _die(680);
    // unreachable;
   }
  } else if ((($option$0$ph11|0) == 118)) {
   $11 = HEAP32[$woffLen>>2]|0;
   _woffGetFontVersion($10,$11,$maj,$min,$status);
   $12 = HEAP32[$status>>2]|0;
   $13 = $12 & 255;
   $14 = ($13|0)==(0);
   if ($14) {
    $15 = HEAP16[$maj>>1]|0;
    $16 = $15&65535;
    $17 = HEAP16[$min>>1]|0;
    $18 = $17&65535;
    HEAP32[$vararg_buffer22>>2] = $16;
    $vararg_ptr25 = (($vararg_buffer22) + 4|0);
    HEAP32[$vararg_ptr25>>2] = $18;
    (_printf((672|0),($vararg_buffer22|0))|0);
    break;
   } else {
    _reportErr($12);
    // unreachable;
   }
  } else if ((($option$0$ph11|0) == 112)) {
   $30 = HEAP32[$woffLen>>2]|0;
   $31 = (_woffGetPrivateData($10,$30,$len,$status)|0);
   $32 = HEAP32[$status>>2]|0;
   $33 = $32 & 255;
   $34 = ($33|0)==(0);
   if (!($34)) {
    _reportErr($32);
    // unreachable;
   }
   $35 = ($31|0)==(0|0);
   if (!($35)) {
    $36 = HEAP32[$len>>2]|0;
    $37 = HEAP32[_stdout>>2]|0;
    $38 = (_fwrite(($31|0),1,($36|0),($37|0))|0);
    $39 = HEAP32[$len>>2]|0;
    $40 = ($38|0)==($39|0);
    if ($40) {
     _free($31);
     break;
    } else {
     _die(720);
     // unreachable;
    }
   }
  } else {
   $41 = HEAP32[$woffLen>>2]|0;
   $42 = (_woffDecode($10,$41,$len,$status)|0);
   $43 = HEAP32[$status>>2]|0;
   $44 = $43 & 255;
   $45 = ($44|0)==(0);
   if (!($45)) {
    _reportErr($43);
    // unreachable;
   }
   $46 = ($42|0)==(0|0);
   if ($46) {
    _die(800);
    // unreachable;
   }
   $47 = HEAP32[$len>>2]|0;
   $48 = HEAP32[_stdout>>2]|0;
   $49 = (_fwrite(($42|0),1,($47|0),($48|0))|0);
   $50 = HEAP32[$len>>2]|0;
   $51 = ($49|0)==($50|0);
   if ($51) {
    _free($42);
    break;
   } else {
    _die(760);
    // unreachable;
   }
  }
 } while(0);
 $52 = HEAP32[$status>>2]|0;
 $53 = ($52>>>0)>(255);
 if (!($53)) {
  _free($10);
  STACKTOP = sp;return 0;
 }
 _woffPrintStatus($1,$52,832);
 _free($10);
 STACKTOP = sp;return 0;
}
function _die($msg) {
 $msg = $msg|0;
 var $0 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $vararg_buffer = sp;
 $0 = HEAP32[_stderr>>2]|0;
 HEAP32[$vararg_buffer>>2] = $msg;
 (_fprintf(($0|0),(1168|0),($vararg_buffer|0))|0);
 _exit(2);
 // unreachable;
}
function _reportErr($status) {
 $status = $status|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[_stderr>>2]|0;
 _woffPrintStatus($0,$status,832);
 $1 = $status & 255;
 _exit(($1|0));
 // unreachable;
}
function _getopt($argc,$argv,$optstring) {
 $argc = $argc|0;
 $argv = $argv|0;
 $optstring = $optstring|0;
 var $$0 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $8 = 0, $9 = 0, $c = 0, $d = 0, $i$0$lcssa = 0, $i$04 = 0, $k$0 = 0, $or$cond = 0;
 var $or$cond3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $c = sp + 4|0;
 $d = sp;
 $0 = HEAP32[1232>>2]|0;
 $1 = ($0|0)==(0);
 $2 = HEAP32[1248>>2]|0;
 $3 = ($2|0)!=(0);
 $or$cond = $1 | $3;
 if ($or$cond) {
  HEAP32[1248>>2] = 0;
  HEAP32[1256>>2] = 0;
  HEAP32[1232>>2] = 1;
  $5 = 1;
 } else {
  $5 = $0;
 }
 $4 = ($5|0)<($argc|0);
 if (!($4)) {
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 $6 = (($argv) + ($5<<2)|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ($7|0)==(0|0);
 if ($8) {
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 $9 = HEAP8[$7>>0]|0;
 $10 = ($9<<24>>24)==(45);
 if (!($10)) {
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 $11 = (($7) + 1|0);
 $12 = HEAP8[$11>>0]|0;
 if ((($12<<24>>24) == 45)) {
  label = 7;
 } else if ((($12<<24>>24) == 0)) {
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 if ((label|0) == 7) {
  $13 = (($7) + 2|0);
  $14 = HEAP8[$13>>0]|0;
  $15 = ($14<<24>>24)==(0);
  if ($15) {
   $16 = (($5) + 1)|0;
   HEAP32[1232>>2] = $16;
   $$0 = -1;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $17 = HEAP32[1256>>2]|0;
 $18 = ($17|0)==(0);
 if ($18) {
  HEAP32[1256>>2] = 1;
  $20 = 1;
 } else {
  $20 = $17;
 }
 $19 = (($7) + ($20)|0);
 $21 = (_mbtowc($c,$19,4)|0);
 $22 = ($21|0)<(0);
 if ($22) {
  HEAP32[$c>>2] = 65533;
  $28 = 65533;$k$0 = 1;
 } else {
  $$pre = HEAP32[$c>>2]|0;
  $28 = $$pre;$k$0 = $21;
 }
 $23 = HEAP32[1232>>2]|0;
 $24 = (($argv) + ($23<<2)|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = HEAP32[1256>>2]|0;
 $27 = (($25) + ($26)|0);
 HEAP32[1264>>2] = $28;
 $29 = (($26) + ($k$0))|0;
 HEAP32[1256>>2] = $29;
 $30 = (($25) + ($29)|0);
 $31 = HEAP8[$30>>0]|0;
 $32 = ($31<<24>>24)==(0);
 if ($32) {
  $33 = (($23) + 1)|0;
  HEAP32[1232>>2] = $33;
  HEAP32[1256>>2] = 0;
 }
 $34 = (_mbtowc($d,$optstring,4)|0);
 $35 = ($34|0)==(0);
 L30: do {
  if ($35) {
   $i$0$lcssa = 0;
  } else {
   $40 = $34;$i$04 = 0;
   while(1) {
    $36 = HEAP32[$d>>2]|0;
    $37 = HEAP32[$c>>2]|0;
    $38 = ($36|0)==($37|0);
    if ($38) {
     $i$0$lcssa = $i$04;
     break L30;
    }
    $39 = ($40|0)<(1);
    $41 = $39 ? 1 : $40;
    $42 = (($41) + ($i$04))|0;
    $43 = (($optstring) + ($42)|0);
    $44 = (_mbtowc($d,$43,4)|0);
    $45 = ($44|0)==(0);
    if ($45) {
     $i$0$lcssa = $42;
     break;
    } else {
     $40 = $44;$i$04 = $42;
    }
   }
  }
 } while(0);
 $46 = HEAP32[$d>>2]|0;
 $47 = HEAP32[$c>>2]|0;
 $48 = ($46|0)==($47|0);
 if (!($48)) {
  $49 = HEAP8[$optstring>>0]|0;
  $50 = ($49<<24>>24)!=(58);
  $51 = HEAP32[1240>>2]|0;
  $52 = ($51|0)!=(0);
  $or$cond3 = $50 & $52;
  if (!($or$cond3)) {
   $$0 = 63;
   STACKTOP = sp;return ($$0|0);
  }
  $53 = HEAP32[$argv>>2]|0;
  $54 = (_strlen(($53|0))|0);
  (_write(2,($53|0),($54|0))|0);
  (_write(2,(1272|0),18)|0);
  (_write(2,($27|0),($k$0|0))|0);
  (_write(2,(1296|0),1)|0);
  $$0 = 63;
  STACKTOP = sp;return ($$0|0);
 }
 $55 = (($i$0$lcssa) + 1)|0;
 $56 = (($optstring) + ($55)|0);
 $57 = HEAP8[$56>>0]|0;
 $58 = ($57<<24>>24)==(58);
 if (!($58)) {
  $$0 = $46;
  STACKTOP = sp;return ($$0|0);
 }
 $59 = HEAP32[1232>>2]|0;
 $60 = ($59|0)<($argc|0);
 if ($60) {
  $67 = (($59) + 1)|0;
  HEAP32[1232>>2] = $67;
  $68 = (($argv) + ($59<<2)|0);
  $69 = HEAP32[$68>>2]|0;
  $70 = HEAP32[1256>>2]|0;
  $71 = (($69) + ($70)|0);
  HEAP32[1336>>2] = $71;
  HEAP32[1256>>2] = 0;
  $$0 = $46;
  STACKTOP = sp;return ($$0|0);
 }
 $61 = HEAP8[$optstring>>0]|0;
 $62 = ($61<<24>>24)==(58);
 if ($62) {
  $$0 = 58;
  STACKTOP = sp;return ($$0|0);
 }
 $63 = HEAP32[1240>>2]|0;
 $64 = ($63|0)==(0);
 if ($64) {
  $$0 = 63;
  STACKTOP = sp;return ($$0|0);
 }
 $65 = HEAP32[$argv>>2]|0;
 $66 = (_strlen(($65|0))|0);
 (_write(2,($65|0),($66|0))|0);
 (_write(2,(1304|0),31)|0);
 (_write(2,($27|0),($k$0|0))|0);
 (_write(2,(1296|0),1)|0);
 $$0 = 63;
 STACKTOP = sp;return ($$0|0);
}
function _mbtowc($wc,$src,$n) {
 $wc = $wc|0;
 $src = $src|0;
 $n = $n|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $0 = sp;
 HEAP32[$0>>2] = $wc;
 $1 = ($src|0)==(0|0);
 if ($1) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $2 = ($n|0)==(0);
 do {
  if (!($2)) {
   $3 = ($wc|0)==(0|0);
   if ($3) {
    HEAP32[$0>>2] = $0;
    $7 = $0;
   } else {
    $7 = $wc;
   }
   $4 = HEAP8[$src>>0]|0;
   $5 = $4&255;
   $6 = ($4<<24>>24)>(-1);
   if ($6) {
    HEAP32[$7>>2] = $5;
    $8 = ($4<<24>>24)!=(0);
    $9 = $8&1;
    $$0 = $9;
    STACKTOP = sp;return ($$0|0);
   }
   $10 = (($5) + -194)|0;
   $11 = ($10>>>0)>(50);
   if (!($11)) {
    $12 = (($src) + 1|0);
    $13 = (1344 + ($10<<2)|0);
    $14 = HEAP32[$13>>2]|0;
    $15 = ($n>>>0)<(4);
    if ($15) {
     $16 = ($n*6)|0;
     $17 = (($16) + -6)|0;
     $18 = -2147483648 >>> $17;
     $19 = $14 & $18;
     $20 = ($19|0)==(0);
     if (!($20)) {
      break;
     }
    }
    $21 = HEAP8[$12>>0]|0;
    $22 = $21&255;
    $23 = $22 >>> 3;
    $24 = (($23) + -16)|0;
    $25 = $14 >> 26;
    $26 = (($23) + ($25))|0;
    $27 = $24 | $26;
    $28 = ($27>>>0)>(7);
    if (!($28)) {
     $29 = $14 << 6;
     $30 = (($22) + -128)|0;
     $31 = $30 | $29;
     $32 = ($31|0)<(0);
     if (!($32)) {
      HEAP32[$7>>2] = $31;
      $$0 = 2;
      STACKTOP = sp;return ($$0|0);
     }
     $33 = (($src) + 2|0);
     $34 = HEAP8[$33>>0]|0;
     $35 = $34&255;
     $36 = $35 & 192;
     $37 = ($36|0)==(128);
     if ($37) {
      $38 = $31 << 6;
      $39 = (($35) + -128)|0;
      $40 = $39 | $38;
      $41 = ($40|0)<(0);
      if (!($41)) {
       HEAP32[$7>>2] = $40;
       $$0 = 3;
       STACKTOP = sp;return ($$0|0);
      }
      $42 = (($src) + 3|0);
      $43 = HEAP8[$42>>0]|0;
      $44 = $43&255;
      $45 = $44 & 192;
      $46 = ($45|0)==(128);
      if ($46) {
       $47 = $40 << 6;
       $48 = (($44) + -128)|0;
       $49 = $48 | $47;
       HEAP32[$7>>2] = $49;
       $$0 = 4;
       STACKTOP = sp;return ($$0|0);
      }
     }
    }
   }
  }
 } while(0);
 $50 = (___errno_location()|0);
 HEAP32[$50>>2] = 84;
 $$0 = -1;
 STACKTOP = sp;return ($$0|0);
}
function _qsort($base,$nel,$width,$cmp) {
 $base = $base|0;
 $nel = $nel|0;
 $width = $width|0;
 $cmp = $cmp|0;
 var $$ = 0, $$0$be$i = 0, $$0$be$i20 = 0, $$0$i48 = 0, $$01$be$i = 0, $$01$be$i19 = 0, $$012$i = 0, $$012$i16 = 0, $$02$i$i = 0, $$02$i3$i = 0, $$02$i3481 = 0, $$02$i82 = 0, $$02$us$i = 0, $$02$us$i32 = 0, $$03$i = 0, $$03$i15 = 0, $$67 = 0, $$68 = 0, $$lcssa = 0, $$lcssa75 = 0;
 var $$lcssa76 = 0, $$lcssa97 = 0, $$pre = 0, $$pre$i = 0, $$pre$i10 = 0, $$pre$i22 = 0, $$pre$i28 = 0, $$sum = 0, $$sum$i = 0, $$sum$i18 = 0, $$sum2 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0;
 var $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0;
 var $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0;
 var $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0;
 var $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0;
 var $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $4$phi = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0;
 var $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $ar$i = 0, $exitcond$i = 0;
 var $exitcond$i31 = 0, $head$0$lcssa = 0, $head$083 = 0, $head$179 = 0, $i$0 = 0, $i$0$lcssa$i = 0, $i$0$lcssa$i24 = 0, $i$01$us$i = 0, $i$01$us$i30 = 0, $i$04$i = 0, $i$04$i14 = 0, $lp = 0, $nTrailingZeros$03$i$i = 0, $nTrailingZeros$03$i2$i = 0, $nTrailingZeros$03$i2$i$lcssa = 0, $or$cond = 0, $or$cond69 = 0, $or$cond6978 = 0, $or$cond77 = 0, $pshift$0$lcssa = 0;
 var $pshift$084 = 0, $pshift$1 = 0, $pshift$280 = 0, $sum = 0, $sum$i = 0, $sum$i17 = 0, $tmp$i = 0, $tmp$i26 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 944|0;
 $tmp$i26 = sp + 680|0;
 $tmp$i = sp + 424|0;
 $ar$i = sp + 192|0;
 $lp = sp;
 $0 = Math_imul($width, $nel)|0;
 $1 = ($0|0)==(0);
 if ($1) {
  STACKTOP = sp;return;
 }
 $$sum = (($0) - ($width))|0;
 $2 = (($lp) + 4|0);
 HEAP32[$2>>2] = $width;
 HEAP32[$lp>>2] = $width;
 $4 = $width;$6 = $width;$i$0 = 2;
 while(1) {
  $3 = (($4) + ($width))|0;
  $5 = (($3) + ($6))|0;
  $7 = (($lp) + ($i$0<<2)|0);
  HEAP32[$7>>2] = $5;
  $8 = ($5>>>0)<($0>>>0);
  $9 = (($i$0) + 1)|0;
  if ($8) {
   $4$phi = $6;$6 = $5;$i$0 = $9;$4 = $4$phi;
  } else {
   break;
  }
 }
 $10 = (0 - ($width))|0;
 $11 = (($base) + ($$sum)|0);
 $12 = ($$sum|0)>(0);
 if ($12) {
  $13 = ($width|0)==(0);
  $14 = ($width>>>0)>(256);
  $15 = $14 ? 256 : $width;
  $16 = ($15|0)==($width|0);
  $17 = $11;
  $19 = 1;$61 = 0;$head$083 = $base;$pshift$084 = 1;
  while(1) {
   $18 = $19 & 3;
   $20 = ($18|0)==(3);
   do {
    if ($20) {
     HEAP32[$ar$i>>2] = $head$083;
     $21 = ($pshift$084|0)>(1);
     L13: do {
      if ($21) {
       $$012$i = $pshift$084;$$03$i = $head$083;$27 = $head$083;$i$04$i = 1;
       while(1) {
        $22 = (($$03$i) + ($10)|0);
        $23 = (($$012$i) + -2)|0;
        $24 = (($lp) + ($23<<2)|0);
        $25 = HEAP32[$24>>2]|0;
        $sum$i = (($25) + ($width))|0;
        $$sum$i = (0 - ($sum$i))|0;
        $26 = (($$03$i) + ($$sum$i)|0);
        $28 = (FUNCTION_TABLE_iii[$cmp & 1]($27,$26)|0);
        $29 = ($28|0)>(-1);
        if ($29) {
         $30 = (FUNCTION_TABLE_iii[$cmp & 1]($27,$22)|0);
         $31 = ($30|0)>(-1);
         if ($31) {
          $i$0$lcssa$i = $i$04$i;
          break;
         }
        }
        $32 = (FUNCTION_TABLE_iii[$cmp & 1]($26,$22)|0);
        $33 = ($32|0)>(-1);
        $34 = (($i$04$i) + 1)|0;
        $35 = (($ar$i) + ($i$04$i<<2)|0);
        if ($33) {
         HEAP32[$35>>2] = $26;
         $36 = (($$012$i) + -1)|0;
         $$0$be$i = $26;$$01$be$i = $36;
        } else {
         HEAP32[$35>>2] = $22;
         $$0$be$i = $22;$$01$be$i = $23;
        }
        $37 = ($$01$be$i|0)>(1);
        if (!($37)) {
         $i$0$lcssa$i = $34;
         break;
        }
        $$pre$i = HEAP32[$ar$i>>2]|0;
        $$012$i = $$01$be$i;$$03$i = $$0$be$i;$27 = $$pre$i;$i$04$i = $34;
       }
       $38 = ($i$0$lcssa$i|0)<(2);
       if (!($38)) {
        $39 = (($ar$i) + ($i$0$lcssa$i<<2)|0);
        HEAP32[$39>>2] = $tmp$i;
        if (!($13)) {
         $40 = ($i$0$lcssa$i|0)>(0);
         if ($40) {
          $$02$us$i = $width;$53 = $tmp$i;
         } else {
          $41 = HEAP32[$ar$i>>2]|0;
          _memcpy(($tmp$i|0),($41|0),($15|0))|0;
          if ($16) {
           break;
          } else {
           $$02$i82 = $width;$55 = $15;
          }
          while(1) {
           $54 = (($$02$i82) - ($55))|0;
           $56 = ($54>>>0)>(256);
           $57 = $56 ? 256 : $54;
           _memcpy(($tmp$i|0),($41|0),($57|0))|0;
           $58 = ($54|0)==($57|0);
           if ($58) {
            break L13;
           } else {
            $$02$i82 = $54;$55 = $57;
           }
          }
         }
         while(1) {
          $51 = ($$02$us$i>>>0)>(256);
          $43 = $51 ? 256 : $$02$us$i;
          $52 = HEAP32[$ar$i>>2]|0;
          _memcpy(($53|0),($52|0),($43|0))|0;
          $49 = $52;$i$01$us$i = 0;
          while(1) {
           $45 = (($ar$i) + ($i$01$us$i<<2)|0);
           $46 = (($i$01$us$i) + 1)|0;
           $47 = (($ar$i) + ($46<<2)|0);
           $48 = HEAP32[$47>>2]|0;
           _memcpy(($49|0),($48|0),($43|0))|0;
           $50 = (($49) + ($43)|0);
           HEAP32[$45>>2] = $50;
           $exitcond$i = ($46|0)==($i$0$lcssa$i|0);
           if ($exitcond$i) {
            break;
           } else {
            $49 = $48;$i$01$us$i = $46;
           }
          }
          $42 = ($$02$us$i|0)==($43|0);
          if ($42) {
           break L13;
          }
          $44 = (($$02$us$i) - ($43))|0;
          $$pre$i10 = HEAP32[$39>>2]|0;
          $$02$us$i = $44;$53 = $$pre$i10;
         }
        }
       }
      }
     } while(0);
     $59 = $19 >>> 2;
     $60 = $61 << 30;
     $62 = $59 | $60;
     $63 = $61 >>> 2;
     $64 = (($pshift$084) + 2)|0;
     $122 = $62;$185 = $63;$pshift$1 = $64;
    } else {
     $65 = (($pshift$084) + -1)|0;
     $66 = (($lp) + ($65<<2)|0);
     $67 = HEAP32[$66>>2]|0;
     $68 = $head$083;
     $69 = (($17) - ($68))|0;
     $70 = ($67>>>0)<($69>>>0);
     L39: do {
      if ($70) {
       HEAP32[$ar$i>>2] = $head$083;
       $71 = ($pshift$084|0)>(1);
       if ($71) {
        $$012$i16 = $pshift$084;$$03$i15 = $head$083;$77 = $head$083;$i$04$i14 = 1;
        while(1) {
         $72 = (($$03$i15) + ($10)|0);
         $73 = (($$012$i16) + -2)|0;
         $74 = (($lp) + ($73<<2)|0);
         $75 = HEAP32[$74>>2]|0;
         $sum$i17 = (($75) + ($width))|0;
         $$sum$i18 = (0 - ($sum$i17))|0;
         $76 = (($$03$i15) + ($$sum$i18)|0);
         $78 = (FUNCTION_TABLE_iii[$cmp & 1]($77,$76)|0);
         $79 = ($78|0)>(-1);
         if ($79) {
          $80 = (FUNCTION_TABLE_iii[$cmp & 1]($77,$72)|0);
          $81 = ($80|0)>(-1);
          if ($81) {
           $i$0$lcssa$i24 = $i$04$i14;
           break;
          }
         }
         $82 = (FUNCTION_TABLE_iii[$cmp & 1]($76,$72)|0);
         $83 = ($82|0)>(-1);
         $84 = (($i$04$i14) + 1)|0;
         $85 = (($ar$i) + ($i$04$i14<<2)|0);
         if ($83) {
          HEAP32[$85>>2] = $76;
          $86 = (($$012$i16) + -1)|0;
          $$0$be$i20 = $76;$$01$be$i19 = $86;
         } else {
          HEAP32[$85>>2] = $72;
          $$0$be$i20 = $72;$$01$be$i19 = $73;
         }
         $87 = ($$01$be$i19|0)>(1);
         if (!($87)) {
          $i$0$lcssa$i24 = $84;
          break;
         }
         $$pre$i22 = HEAP32[$ar$i>>2]|0;
         $$012$i16 = $$01$be$i19;$$03$i15 = $$0$be$i20;$77 = $$pre$i22;$i$04$i14 = $84;
        }
        $88 = ($i$0$lcssa$i24|0)<(2);
        if (!($88)) {
         $89 = (($ar$i) + ($i$0$lcssa$i24<<2)|0);
         HEAP32[$89>>2] = $tmp$i26;
         if (!($13)) {
          $90 = ($i$0$lcssa$i24|0)>(0);
          if ($90) {
           $$02$us$i32 = $width;$103 = $tmp$i26;
          } else {
           $91 = HEAP32[$ar$i>>2]|0;
           _memcpy(($tmp$i26|0),($91|0),($15|0))|0;
           if ($16) {
            break;
           } else {
            $$02$i3481 = $width;$105 = $15;
           }
           while(1) {
            $104 = (($$02$i3481) - ($105))|0;
            $106 = ($104>>>0)>(256);
            $107 = $106 ? 256 : $104;
            _memcpy(($tmp$i26|0),($91|0),($107|0))|0;
            $108 = ($104|0)==($107|0);
            if ($108) {
             break L39;
            } else {
             $$02$i3481 = $104;$105 = $107;
            }
           }
          }
          while(1) {
           $101 = ($$02$us$i32>>>0)>(256);
           $93 = $101 ? 256 : $$02$us$i32;
           $102 = HEAP32[$ar$i>>2]|0;
           _memcpy(($103|0),($102|0),($93|0))|0;
           $99 = $102;$i$01$us$i30 = 0;
           while(1) {
            $95 = (($ar$i) + ($i$01$us$i30<<2)|0);
            $96 = (($i$01$us$i30) + 1)|0;
            $97 = (($ar$i) + ($96<<2)|0);
            $98 = HEAP32[$97>>2]|0;
            _memcpy(($99|0),($98|0),($93|0))|0;
            $100 = (($99) + ($93)|0);
            HEAP32[$95>>2] = $100;
            $exitcond$i31 = ($96|0)==($i$0$lcssa$i24|0);
            if ($exitcond$i31) {
             break;
            } else {
             $99 = $98;$i$01$us$i30 = $96;
            }
           }
           $92 = ($$02$us$i32|0)==($93|0);
           if ($92) {
            break L39;
           }
           $94 = (($$02$us$i32) - ($93))|0;
           $$pre$i28 = HEAP32[$89>>2]|0;
           $$02$us$i32 = $94;$103 = $$pre$i28;
          }
         }
        }
       }
      } else {
       _trinkle($head$083,$width,$cmp,$19,$61,$pshift$084,0,$lp);
      }
     } while(0);
     $109 = ($pshift$084|0)==(1);
     if ($109) {
      $110 = $61 << 1;
      $111 = $19 >>> 31;
      $112 = $111 | $110;
      $113 = $19 << 1;
      $122 = $113;$185 = $112;$pshift$1 = 0;
      break;
     } else {
      $114 = ($65>>>0)>(31);
      $115 = (($pshift$084) + -33)|0;
      $$ = $114 ? 0 : $19;
      $$67 = $114 ? $19 : $61;
      $$68 = $114 ? $115 : $65;
      $116 = $$67 << $$68;
      $117 = (32 - ($$68))|0;
      $118 = $$ >>> $117;
      $119 = $118 | $116;
      $120 = $$ << $$68;
      $122 = $120;$185 = $119;$pshift$1 = 1;
      break;
     }
    }
   } while(0);
   $121 = $122 | 1;
   $123 = (($head$083) + ($width)|0);
   $124 = ($123>>>0)<($11>>>0);
   if ($124) {
    $19 = $121;$61 = $185;$head$083 = $123;$pshift$084 = $pshift$1;
   } else {
    $$lcssa75 = $185;$$lcssa76 = $121;$head$0$lcssa = $123;$pshift$0$lcssa = $pshift$1;
    break;
   }
  }
 } else {
  $$lcssa75 = 0;$$lcssa76 = 1;$head$0$lcssa = $base;$pshift$0$lcssa = 1;
 }
 _trinkle($head$0$lcssa,$width,$cmp,$$lcssa76,$$lcssa75,$pshift$0$lcssa,0,$lp);
 $125 = ($pshift$0$lcssa|0)==(1);
 $126 = ($$lcssa76|0)==(1);
 $or$cond77 = $125 & $126;
 $127 = ($$lcssa75|0)==(0);
 $or$cond6978 = $or$cond77 & $127;
 if ($or$cond6978) {
  STACKTOP = sp;return;
 } else {
  $130 = $$lcssa76;$140 = $$lcssa75;$head$179 = $head$0$lcssa;$pshift$280 = $pshift$0$lcssa;
 }
 while(1) {
  $128 = ($pshift$280|0)<(2);
  if (!($128)) {
   $153 = $140 << 2;
   $154 = $130 >>> 30;
   $155 = $154 | $153;
   $156 = (($pshift$280) + -2)|0;
   $157 = $130 << 1;
   $158 = $157 & 2147483646;
   $159 = $154 << 31;
   $160 = $158 | $159;
   $161 = $160 ^ 3;
   $162 = $155 >>> 1;
   $163 = (($lp) + ($156<<2)|0);
   $164 = HEAP32[$163>>2]|0;
   $sum = (($164) + ($width))|0;
   $$sum2 = (0 - ($sum))|0;
   $165 = (($head$179) + ($$sum2)|0);
   $166 = (($pshift$280) + -1)|0;
   _trinkle($165,$width,$cmp,$161,$162,$166,1,$lp);
   $167 = $162 << 1;
   $168 = $154 & 1;
   $169 = $167 | $168;
   $170 = $161 << 1;
   $171 = $170 | 1;
   $172 = (($head$179) + ($10)|0);
   _trinkle($172,$width,$cmp,$171,$169,$156,1,$lp);
   $130 = $171;$140 = $169;$head$179 = $172;$pshift$280 = $156;
   continue;
  }
  $129 = (($130) + -1)|0;
  $131 = ($129|0)==(0);
  do {
   if ($131) {
    $152 = 32;
    label = 59;
   } else {
    $132 = $129 & 1;
    $133 = ($132|0)==(0);
    if ($133) {
     $$02$i$i = $129;$nTrailingZeros$03$i$i = 0;
     while(1) {
      $134 = (($nTrailingZeros$03$i$i) + 1)|0;
      $135 = $$02$i$i >>> 1;
      $136 = $135 & 1;
      $137 = ($136|0)==(0);
      if ($137) {
       $$02$i$i = $135;$nTrailingZeros$03$i$i = $134;
      } else {
       $$lcssa = $134;
       break;
      }
     }
     $138 = ($$lcssa|0)==(0);
     if ($138) {
      label = 54;
     } else {
      $150 = $$lcssa;
     }
    } else {
     label = 54;
    }
    if ((label|0) == 54) {
     label = 0;
     $139 = ($140|0)==(0);
     if ($139) {
      $152 = 64;
      label = 59;
      break;
     }
     $141 = $140 & 1;
     $142 = ($141|0)==(0);
     if ($142) {
      $$02$i3$i = $140;$nTrailingZeros$03$i2$i = 0;
     } else {
      $$0$i48 = 0;$174 = $130;$177 = $140;$181 = 0;
      break;
     }
     while(1) {
      $143 = (($nTrailingZeros$03$i2$i) + 1)|0;
      $144 = $$02$i3$i >>> 1;
      $145 = $144 & 1;
      $146 = ($145|0)==(0);
      if ($146) {
       $$02$i3$i = $144;$nTrailingZeros$03$i2$i = $143;
      } else {
       $$lcssa97 = $143;$nTrailingZeros$03$i2$i$lcssa = $nTrailingZeros$03$i2$i;
       break;
      }
     }
     $147 = (($nTrailingZeros$03$i2$i$lcssa) + 33)|0;
     $148 = ($$lcssa97|0)==(0);
     if ($148) {
      $$0$i48 = 0;$174 = $130;$177 = $140;$181 = 0;
      break;
     } else {
      $150 = $147;
     }
    }
    $149 = ($150>>>0)>(31);
    if ($149) {
     $152 = $150;
     label = 59;
    } else {
     $$0$i48 = $150;$174 = $130;$177 = $140;$181 = $150;
    }
   }
  } while(0);
  if ((label|0) == 59) {
   label = 0;
   $151 = (($152) + -32)|0;
   $$0$i48 = $151;$174 = $140;$177 = 0;$181 = $152;
  }
  $173 = $174 >>> $$0$i48;
  $175 = (32 - ($$0$i48))|0;
  $176 = $177 << $175;
  $178 = $176 | $173;
  $179 = $177 >>> $$0$i48;
  $180 = (($181) + ($pshift$280))|0;
  $$pre = (($head$179) + ($10)|0);
  $182 = ($180|0)==(1);
  $183 = ($178|0)==(1);
  $or$cond = $182 & $183;
  $184 = ($179|0)==(0);
  $or$cond69 = $or$cond & $184;
  if ($or$cond69) {
   break;
  } else {
   $130 = $178;$140 = $179;$head$179 = $$pre;$pshift$280 = $180;
  }
 }
 STACKTOP = sp;return;
}
function _trinkle($head,$width,$cmp,$pp$val,$pp$1$val,$pshift,$trusty,$lp) {
 $head = $head|0;
 $width = $width|0;
 $cmp = $cmp|0;
 $pp$val = $pp$val|0;
 $pp$1$val = $pp$1$val|0;
 $pshift = $pshift|0;
 $trusty = $trusty|0;
 $lp = $lp|0;
 var $$0$be$i = 0, $$0$i = 0, $$0$lcssa = 0, $$0$lcssa54 = 0, $$01$be$i = 0, $$012$i = 0, $$017 = 0, $$02$i$i = 0, $$02$i1610 = 0, $$02$i3$i = 0, $$02$i9 = 0, $$02$lcssa = 0, $$02$lcssa56 = 0, $$02$us$i = 0, $$02$us$i14 = 0, $$0215 = 0, $$03$i = 0, $$03$lcssa = 0, $$0314 = 0, $$lcssa = 0;
 var $$lcssa59 = 0, $$pre = 0, $$pre$i = 0, $$pre$i10 = 0, $$pre$i6 = 0, $$sum = 0, $$sum$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0;
 var $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $13 = 0, $14 = 0;
 var $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0;
 var $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0;
 var $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0;
 var $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $ar = 0, $ar$i = 0, $exitcond$i = 0, $exitcond$i13 = 0, $i$0$lcssa = 0, $i$0$lcssa$i = 0, $i$0$lcssa55 = 0;
 var $i$01$us$i = 0, $i$01$us$i12 = 0, $i$016 = 0, $i$04$i = 0, $nTrailingZeros$03$i$i = 0, $nTrailingZeros$03$i2$i = 0, $nTrailingZeros$03$i2$i$lcssa = 0, $or$cond = 0, $or$cond5 = 0, $or$cond511 = 0, $pp$val112 = 0, $sum = 0, $sum$i = 0, $tmp$i8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 720|0;
 $tmp$i8 = sp + 456|0;
 $ar$i = sp + 228|0;
 $ar = sp;
 HEAP32[$ar>>2] = $head;
 $0 = (0 - ($width))|0;
 $1 = ($pp$val|0)==(1);
 $2 = ($pp$1$val|0)==(0);
 $or$cond511 = $1 & $2;
 L1: do {
  if ($or$cond511) {
   $$0$lcssa = $head;$$02$lcssa = $pshift;$$03$lcssa = $trusty;$i$0$lcssa = 1;
   label = 18;
  } else {
   $$017 = $head;$$0215 = $pshift;$$0314 = $trusty;$124 = $2;$33 = $pp$1$val;$7 = $head;$i$016 = 1;$pp$val112 = $pp$val;
   while(1) {
    $3 = (($lp) + ($$0215<<2)|0);
    $4 = HEAP32[$3>>2]|0;
    $5 = (0 - ($4))|0;
    $6 = (($$017) + ($5)|0);
    $8 = (FUNCTION_TABLE_iii[$cmp & 1]($6,$7)|0);
    $9 = ($8|0)<(1);
    if ($9) {
     $$0$lcssa = $$017;$$02$lcssa = $$0215;$$03$lcssa = $$0314;$i$0$lcssa = $i$016;
     label = 18;
     break L1;
    }
    $10 = ($$0314|0)==(0);
    $11 = ($$0215|0)>(1);
    $or$cond = $10 & $11;
    if ($or$cond) {
     $12 = (($$017) + ($0)|0);
     $13 = (($$0215) + -2)|0;
     $14 = (($lp) + ($13<<2)|0);
     $15 = HEAP32[$14>>2]|0;
     $16 = (FUNCTION_TABLE_iii[$cmp & 1]($12,$6)|0);
     $17 = ($16|0)>(-1);
     if ($17) {
      $$0$lcssa54 = $$017;$$02$lcssa56 = $$0215;$i$0$lcssa55 = $i$016;
      break L1;
     }
     $sum = (($15) + ($width))|0;
     $$sum = (0 - ($sum))|0;
     $18 = (($$017) + ($$sum)|0);
     $19 = (FUNCTION_TABLE_iii[$cmp & 1]($18,$6)|0);
     $20 = ($19|0)>(-1);
     if ($20) {
      $$0$lcssa54 = $$017;$$02$lcssa56 = $$0215;$i$0$lcssa55 = $i$016;
      break L1;
     }
    }
    $21 = (($i$016) + 1)|0;
    $22 = (($ar) + ($i$016<<2)|0);
    HEAP32[$22>>2] = $6;
    $23 = (($pp$val112) + -1)|0;
    $24 = ($23|0)==(0);
    do {
     if ($24) {
      $44 = 32;
      label = 15;
     } else {
      $25 = $23 & 1;
      $26 = ($25|0)==(0);
      if ($26) {
       $$02$i$i = $23;$nTrailingZeros$03$i$i = 0;
       while(1) {
        $27 = (($nTrailingZeros$03$i$i) + 1)|0;
        $28 = $$02$i$i >>> 1;
        $29 = $28 & 1;
        $30 = ($29|0)==(0);
        if ($30) {
         $$02$i$i = $28;$nTrailingZeros$03$i$i = $27;
        } else {
         $$lcssa = $27;
         break;
        }
       }
       $31 = ($$lcssa|0)==(0);
       if ($31) {
        label = 10;
       } else {
        $42 = $$lcssa;
       }
      } else {
       label = 10;
      }
      if ((label|0) == 10) {
       label = 0;
       if ($124) {
        $44 = 64;
        label = 15;
        break;
       }
       $32 = $33 & 1;
       $34 = ($32|0)==(0);
       if ($34) {
        $$02$i3$i = $33;$nTrailingZeros$03$i2$i = 0;
       } else {
        $$0$i = 0;$46 = $pp$val112;$49 = $33;$53 = 0;
        break;
       }
       while(1) {
        $35 = (($nTrailingZeros$03$i2$i) + 1)|0;
        $36 = $$02$i3$i >>> 1;
        $37 = $36 & 1;
        $38 = ($37|0)==(0);
        if ($38) {
         $$02$i3$i = $36;$nTrailingZeros$03$i2$i = $35;
        } else {
         $$lcssa59 = $35;$nTrailingZeros$03$i2$i$lcssa = $nTrailingZeros$03$i2$i;
         break;
        }
       }
       $39 = (($nTrailingZeros$03$i2$i$lcssa) + 33)|0;
       $40 = ($$lcssa59|0)==(0);
       if ($40) {
        $$0$i = 0;$46 = $pp$val112;$49 = $33;$53 = 0;
        break;
       } else {
        $42 = $39;
       }
      }
      $41 = ($42>>>0)>(31);
      if ($41) {
       $44 = $42;
       label = 15;
      } else {
       $$0$i = $42;$46 = $pp$val112;$49 = $33;$53 = $42;
      }
     }
    } while(0);
    if ((label|0) == 15) {
     label = 0;
     $43 = (($44) + -32)|0;
     $$0$i = $43;$46 = $33;$49 = 0;$53 = $44;
    }
    $45 = $46 >>> $$0$i;
    $47 = (32 - ($$0$i))|0;
    $48 = $49 << $47;
    $50 = $48 | $45;
    $51 = $49 >>> $$0$i;
    $52 = (($53) + ($$0215))|0;
    $54 = ($50|0)==(1);
    $55 = ($51|0)==(0);
    $or$cond5 = $54 & $55;
    if ($or$cond5) {
     $$0$lcssa54 = $6;$$02$lcssa56 = $52;$i$0$lcssa55 = $21;
     break L1;
    }
    $$pre = HEAP32[$ar>>2]|0;
    $$017 = $6;$$0215 = $52;$$0314 = 0;$124 = $55;$33 = $51;$7 = $$pre;$i$016 = $21;$pp$val112 = $50;
   }
  }
 } while(0);
 if ((label|0) == 18) {
  $56 = ($$03$lcssa|0)==(0);
  if ($56) {
   $$0$lcssa54 = $$0$lcssa;$$02$lcssa56 = $$02$lcssa;$i$0$lcssa55 = $i$0$lcssa;
  } else {
   STACKTOP = sp;return;
  }
 }
 $57 = ($i$0$lcssa55|0)<(2);
 L30: do {
  if (!($57)) {
   $58 = (($ar) + ($i$0$lcssa55<<2)|0);
   HEAP32[$58>>2] = $tmp$i8;
   $59 = ($width|0)==(0);
   if (!($59)) {
    $60 = ($i$0$lcssa55|0)>(0);
    if ($60) {
     $$02$us$i14 = $width;$76 = $tmp$i8;
    } else {
     $61 = ($width>>>0)>(256);
     $62 = $61 ? 256 : $width;
     $63 = HEAP32[$ar>>2]|0;
     _memcpy(($tmp$i8|0),($63|0),($62|0))|0;
     $64 = ($62|0)==($width|0);
     if ($64) {
      break;
     } else {
      $$02$i1610 = $width;$78 = $62;
     }
     while(1) {
      $77 = (($$02$i1610) - ($78))|0;
      $79 = ($77>>>0)>(256);
      $80 = $79 ? 256 : $77;
      _memcpy(($tmp$i8|0),($63|0),($80|0))|0;
      $81 = ($77|0)==($80|0);
      if ($81) {
       break L30;
      } else {
       $$02$i1610 = $77;$78 = $80;
      }
     }
    }
    while(1) {
     $74 = ($$02$us$i14>>>0)>(256);
     $66 = $74 ? 256 : $$02$us$i14;
     $75 = HEAP32[$ar>>2]|0;
     _memcpy(($76|0),($75|0),($66|0))|0;
     $72 = $75;$i$01$us$i12 = 0;
     while(1) {
      $68 = (($ar) + ($i$01$us$i12<<2)|0);
      $69 = (($i$01$us$i12) + 1)|0;
      $70 = (($ar) + ($69<<2)|0);
      $71 = HEAP32[$70>>2]|0;
      _memcpy(($72|0),($71|0),($66|0))|0;
      $73 = (($72) + ($66)|0);
      HEAP32[$68>>2] = $73;
      $exitcond$i13 = ($69|0)==($i$0$lcssa55|0);
      if ($exitcond$i13) {
       break;
      } else {
       $72 = $71;$i$01$us$i12 = $69;
      }
     }
     $65 = ($$02$us$i14|0)==($66|0);
     if ($65) {
      break L30;
     }
     $67 = (($$02$us$i14) - ($66))|0;
     $$pre$i10 = HEAP32[$58>>2]|0;
     $$02$us$i14 = $67;$76 = $$pre$i10;
    }
   }
  }
 } while(0);
 HEAP32[$ar$i>>2] = $$0$lcssa54;
 $82 = ($$02$lcssa56|0)>(1);
 L44: do {
  if ($82) {
   $$012$i = $$02$lcssa56;$$03$i = $$0$lcssa54;$88 = $$0$lcssa54;$i$04$i = 1;
   while(1) {
    $83 = (($$03$i) + ($0)|0);
    $84 = (($$012$i) + -2)|0;
    $85 = (($lp) + ($84<<2)|0);
    $86 = HEAP32[$85>>2]|0;
    $sum$i = (($86) + ($width))|0;
    $$sum$i = (0 - ($sum$i))|0;
    $87 = (($$03$i) + ($$sum$i)|0);
    $89 = (FUNCTION_TABLE_iii[$cmp & 1]($88,$87)|0);
    $90 = ($89|0)>(-1);
    if ($90) {
     $91 = (FUNCTION_TABLE_iii[$cmp & 1]($88,$83)|0);
     $92 = ($91|0)>(-1);
     if ($92) {
      $i$0$lcssa$i = $i$04$i;
      break;
     }
    }
    $93 = (FUNCTION_TABLE_iii[$cmp & 1]($87,$83)|0);
    $94 = ($93|0)>(-1);
    $95 = (($i$04$i) + 1)|0;
    $96 = (($ar$i) + ($i$04$i<<2)|0);
    if ($94) {
     HEAP32[$96>>2] = $87;
     $97 = (($$012$i) + -1)|0;
     $$0$be$i = $87;$$01$be$i = $97;
    } else {
     HEAP32[$96>>2] = $83;
     $$0$be$i = $83;$$01$be$i = $84;
    }
    $98 = ($$01$be$i|0)>(1);
    if (!($98)) {
     $i$0$lcssa$i = $95;
     break;
    }
    $$pre$i = HEAP32[$ar$i>>2]|0;
    $$012$i = $$01$be$i;$$03$i = $$0$be$i;$88 = $$pre$i;$i$04$i = $95;
   }
   $99 = ($i$0$lcssa$i|0)<(2);
   if ($99) {
    $125 = $tmp$i8;
   } else {
    $100 = (($ar$i) + ($i$0$lcssa$i<<2)|0);
    HEAP32[$100>>2] = $tmp$i8;
    $101 = ($width|0)==(0);
    if ($101) {
     $125 = $tmp$i8;
    } else {
     $102 = ($i$0$lcssa$i|0)>(0);
     if ($102) {
      $$02$us$i = $width;$118 = $tmp$i8;
     } else {
      $103 = ($width>>>0)>(256);
      $104 = $103 ? 256 : $width;
      $105 = HEAP32[$ar$i>>2]|0;
      _memcpy(($tmp$i8|0),($105|0),($104|0))|0;
      $106 = ($104|0)==($width|0);
      if ($106) {
       $125 = $tmp$i8;
       break;
      } else {
       $$02$i9 = $width;$120 = $104;
      }
      while(1) {
       $119 = (($$02$i9) - ($120))|0;
       $121 = ($119>>>0)>(256);
       $122 = $121 ? 256 : $119;
       _memcpy(($tmp$i8|0),($105|0),($122|0))|0;
       $123 = ($119|0)==($122|0);
       if ($123) {
        $125 = $tmp$i8;
        break L44;
       } else {
        $$02$i9 = $119;$120 = $122;
       }
      }
     }
     while(1) {
      $116 = ($$02$us$i>>>0)>(256);
      $108 = $116 ? 256 : $$02$us$i;
      $117 = HEAP32[$ar$i>>2]|0;
      _memcpy(($118|0),($117|0),($108|0))|0;
      $114 = $117;$i$01$us$i = 0;
      while(1) {
       $110 = (($ar$i) + ($i$01$us$i<<2)|0);
       $111 = (($i$01$us$i) + 1)|0;
       $112 = (($ar$i) + ($111<<2)|0);
       $113 = HEAP32[$112>>2]|0;
       _memcpy(($114|0),($113|0),($108|0))|0;
       $115 = (($114) + ($108)|0);
       HEAP32[$110>>2] = $115;
       $exitcond$i = ($111|0)==($i$0$lcssa$i|0);
       if ($exitcond$i) {
        break;
       } else {
        $114 = $113;$i$01$us$i = $111;
       }
      }
      $107 = ($$02$us$i|0)==($108|0);
      if ($107) {
       $125 = $tmp$i8;
       break L44;
      }
      $109 = (($$02$us$i) - ($108))|0;
      $$pre$i6 = HEAP32[$100>>2]|0;
      $$02$us$i = $109;$118 = $$pre$i6;
     }
    }
   }
  } else {
   $125 = $tmp$i8;
  }
 } while(0);
 STACKTOP = sp;return;
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$lcssa = 0, $$lcssa112 = 0, $$lcssa116 = 0, $$lcssa117 = 0, $$lcssa118 = 0, $$lcssa120 = 0, $$lcssa123 = 0, $$lcssa125 = 0, $$lcssa127 = 0, $$lcssa130 = 0, $$lcssa132 = 0, $$lcssa134 = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i23$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i24$iZ2D = 0, $$pre$phi$i26Z2D = 0;
 var $$pre$phi$iZ2D = 0, $$pre$phi59$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre58$i$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i12$i = 0, $$sum$i13$i = 0, $$sum$i16$i = 0, $$sum$i19$i = 0, $$sum$i2338 = 0, $$sum$i32 = 0, $$sum$i39 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0;
 var $$sum1$i14$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum10$pre$i$i = 0, $$sum102$i = 0, $$sum103$i = 0, $$sum104$i = 0, $$sum105$i = 0, $$sum106$i = 0, $$sum107$i = 0, $$sum108$i = 0, $$sum109$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum11$i22$i = 0, $$sum110$i = 0, $$sum111$i = 0;
 var $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum14$pre$i = 0, $$sum15$i = 0, $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0, $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0;
 var $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i15$i = 0, $$sum2$i17$i = 0, $$sum2$i21$i = 0, $$sum2$pre$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0, $$sum25$i$i = 0, $$sum26$pre$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i$i = 0, $$sum3$i27 = 0;
 var $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0, $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0, $$sum8$pre = 0;
 var $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0;
 var $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0;
 var $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0;
 var $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0;
 var $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0;
 var $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0;
 var $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0;
 var $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0;
 var $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0;
 var $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0;
 var $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0;
 var $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0;
 var $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0;
 var $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0;
 var $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0;
 var $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0;
 var $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0;
 var $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0;
 var $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0;
 var $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0;
 var $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0;
 var $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0;
 var $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0;
 var $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0;
 var $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0;
 var $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0;
 var $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0;
 var $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0;
 var $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0;
 var $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0;
 var $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0;
 var $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0;
 var $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0;
 var $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0;
 var $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0;
 var $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0;
 var $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0;
 var $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0;
 var $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0;
 var $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$c$i$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$029$i = 0, $K2$015$i$i = 0, $K8$053$i$i = 0, $R$0$i = 0, $R$0$i$i = 0, $R$0$i$i$lcssa = 0, $R$0$i$lcssa = 0, $R$0$i18 = 0, $R$0$i18$lcssa = 0, $R$1$i = 0, $R$1$i$i = 0;
 var $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i$i$lcssa = 0, $RP$0$i$lcssa = 0, $RP$0$i17 = 0, $RP$0$i17$lcssa = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i26$i = 0, $T$014$i$i = 0, $T$014$i$i$lcssa = 0, $T$028$i = 0, $T$028$i$lcssa = 0, $T$052$i$i = 0, $T$052$i$i$lcssa = 0, $br$0$i = 0, $br$030$i = 0, $cond$i = 0, $cond$i$i = 0;
 var $cond$i21 = 0, $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i$i = 0, $or$cond$i27$i = 0, $or$cond$i29 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond24$i = 0, $or$cond3$i = 0, $or$cond4$i = 0, $or$cond47$i = 0, $or$cond5$i = 0, $or$cond6$i = 0;
 var $or$cond8$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$lcssa = 0, $rsize$0$i15 = 0, $rsize$1$i = 0, $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$0$i$i$lcssa = 0, $sp$074$i = 0, $sp$074$i$lcssa = 0, $sp$173$i = 0, $sp$173$i$lcssa = 0, $ssize$0$i = 0;
 var $ssize$1$i = 0, $ssize$129$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0, $t$1$i = 0, $t$2$ph$i = 0, $t$2$v$3$i = 0, $t$230$i = 0, $tbase$245$i = 0, $tsize$03141$i = 0, $tsize$1$i = 0, $tsize$244$i = 0, $v$0$i = 0, $v$0$i$lcssa = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$332$i = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   if ($1) {
    $5 = 16;
   } else {
    $2 = (($bytes) + 11)|0;
    $3 = $2 & -8;
    $5 = $3;
   }
   $4 = $5 >>> 3;
   $6 = HEAP32[1552>>2]|0;
   $7 = $6 >>> $4;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($4))|0;
    $13 = $12 << 1;
    $14 = ((1552 + ($13<<2)|0) + 40|0);
    $$sum10 = (($13) + 2)|0;
    $15 = ((1552 + ($$sum10<<2)|0) + 40|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = (($16) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[1552>>2] = $22;
     } else {
      $23 = HEAP32[((1552 + 16|0))>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = (($18) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = (($16) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    STACKTOP = sp;return ($mem$0|0);
   }
   $34 = HEAP32[((1552 + 8|0))>>2]|0;
   $35 = ($5>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $4;
     $38 = 2 << $4;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = ((1552 + ($65<<2)|0) + 40|0);
     $$sum4 = (($65) + 2)|0;
     $67 = ((1552 + ($$sum4<<2)|0) + 40|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = (($68) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[1552>>2] = $74;
       $89 = $34;
      } else {
       $75 = HEAP32[((1552 + 16|0))>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = (($70) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[((1552 + 8|0))>>2]|0;
        $89 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($5))|0;
     $82 = $5 | 3;
     $83 = (($68) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($5)|0);
     $85 = $81 | 1;
     $$sum56 = $5 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $88 = ($89|0)==(0);
     if (!($88)) {
      $90 = HEAP32[((1552 + 20|0))>>2]|0;
      $91 = $89 >>> 3;
      $92 = $91 << 1;
      $93 = ((1552 + ($92<<2)|0) + 40|0);
      $94 = HEAP32[1552>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[1552>>2] = $98;
       $$sum8$pre = (($92) + 2)|0;
       $$pre105 = ((1552 + ($$sum8$pre<<2)|0) + 40|0);
       $$pre$phiZ2D = $$pre105;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = ((1552 + ($$sum9<<2)|0) + 40|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[((1552 + 16|0))>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = (($F4$0) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = (($90) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = (($90) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[((1552 + 8|0))>>2] = $81;
     HEAP32[((1552 + 20|0))>>2] = $84;
     $mem$0 = $69;
     STACKTOP = sp;return ($mem$0|0);
    }
    $106 = HEAP32[((1552 + 4|0))>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $5;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = ((1552 + ($130<<2)|0) + 304|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = (($132) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($5))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = (($t$0$i) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = (($t$0$i) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        $rsize$0$i$lcssa = $rsize$0$i;$v$0$i$lcssa = $v$0$i;
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = (($144) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($5))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[((1552 + 16|0))>>2]|0;
     $150 = ($v$0$i$lcssa>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i$lcssa) + ($5)|0);
     $152 = ($v$0$i$lcssa>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = (($v$0$i$lcssa) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = (($v$0$i$lcssa) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i$lcssa|0);
     do {
      if ($157) {
       $167 = (($v$0$i$lcssa) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = (($v$0$i$lcssa) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = (($R$0$i) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = (($R$0$i) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         $R$0$i$lcssa = $R$0$i;$RP$0$i$lcssa = $RP$0$i;
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i$lcssa>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i$lcssa>>2] = 0;
        $R$1$i = $R$0$i$lcssa;
        break;
       }
      } else {
       $158 = (($v$0$i$lcssa) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = (($159) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i$lcssa|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = (($156) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i$lcssa|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = (($v$0$i$lcssa) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ((1552 + ($182<<2)|0) + 304|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i$lcssa|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[((1552 + 4|0))>>2]|0;
         $189 = $188 & $187;
         HEAP32[((1552 + 4|0))>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[((1552 + 16|0))>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = (($154) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i$lcssa|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = (($154) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[((1552 + 16|0))>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = (($R$1$i) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = (($v$0$i$lcssa) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = (($R$1$i) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = (($201) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = (($v$0$i$lcssa) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[((1552 + 16|0))>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = (($R$1$i) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = (($207) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i$lcssa>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i$lcssa) + ($5))|0;
      $215 = $214 | 3;
      $216 = (($v$0$i$lcssa) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i$lcssa) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $5 | 3;
      $221 = (($v$0$i$lcssa) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i$lcssa | 1;
      $$sum$i39 = $5 | 4;
      $223 = (($v$0$i$lcssa) + ($$sum$i39)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i$lcssa) + ($5))|0;
      $224 = (($v$0$i$lcssa) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i$lcssa;
      $225 = HEAP32[((1552 + 8|0))>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[((1552 + 20|0))>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = ((1552 + ($229<<2)|0) + 40|0);
       $231 = HEAP32[1552>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[1552>>2] = $235;
        $$sum2$pre$i = (($229) + 2)|0;
        $$pre$i = ((1552 + ($$sum2$pre$i<<2)|0) + 40|0);
        $$pre$phi$iZ2D = $$pre$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = ((1552 + ($$sum3$i<<2)|0) + 40|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[((1552 + 16|0))>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = (($F1$0$i) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = (($227) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = (($227) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[((1552 + 8|0))>>2] = $rsize$0$i$lcssa;
      HEAP32[((1552 + 20|0))>>2] = $151;
     }
     $243 = (($v$0$i$lcssa) + 8|0);
     $mem$0 = $243;
     STACKTOP = sp;return ($mem$0|0);
    }
   } else {
    $nb$0 = $5;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[((1552 + 4|0))>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = ((1552 + ($idx$0$i<<2)|0) + 304|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L126: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
      } else {
       $278 = ($idx$0$i|0)==(31);
       if ($278) {
        $282 = 0;
       } else {
        $279 = $idx$0$i >>> 1;
        $280 = (25 - ($279))|0;
        $282 = $280;
       }
       $281 = $246 << $282;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $281;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = (($t$0$i14) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$2$i = $286;$t$1$i = $t$0$i14;$v$2$i = $t$0$i14;
          break L126;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = (($t$0$i14) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = ((($t$0$i14) + ($291<<2)|0) + 16|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     $298 = ($t$1$i|0)==(0|0);
     $299 = ($v$2$i|0)==(0|0);
     $or$cond$i = $298 & $299;
     if ($or$cond$i) {
      $300 = 2 << $idx$0$i;
      $301 = (0 - ($300))|0;
      $302 = $300 | $301;
      $303 = $247 & $302;
      $304 = ($303|0)==(0);
      if ($304) {
       $nb$0 = $246;
       break;
      }
      $305 = (0 - ($303))|0;
      $306 = $303 & $305;
      $307 = (($306) + -1)|0;
      $308 = $307 >>> 12;
      $309 = $308 & 16;
      $310 = $307 >>> $309;
      $311 = $310 >>> 5;
      $312 = $311 & 8;
      $313 = $312 | $309;
      $314 = $310 >>> $312;
      $315 = $314 >>> 2;
      $316 = $315 & 4;
      $317 = $313 | $316;
      $318 = $314 >>> $316;
      $319 = $318 >>> 1;
      $320 = $319 & 2;
      $321 = $317 | $320;
      $322 = $318 >>> $320;
      $323 = $322 >>> 1;
      $324 = $323 & 1;
      $325 = $321 | $324;
      $326 = $322 >>> $324;
      $327 = (($325) + ($326))|0;
      $328 = ((1552 + ($327<<2)|0) + 304|0);
      $329 = HEAP32[$328>>2]|0;
      $t$2$ph$i = $329;
     } else {
      $t$2$ph$i = $t$1$i;
     }
     $330 = ($t$2$ph$i|0)==(0|0);
     if ($330) {
      $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$2$i;
     } else {
      $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$2$i;
      while(1) {
       $331 = (($t$230$i) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = (($t$230$i) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        continue;
       }
       $339 = (($t$230$i) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[((1552 + 8|0))>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[((1552 + 16|0))>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = (($v$3$lcssa$i) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = (($v$3$lcssa$i) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = (($v$3$lcssa$i) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = (($v$3$lcssa$i) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;$RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;$RP$0$i17 = $364;
         }
         while(1) {
          $370 = (($R$0$i18) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = (($R$0$i18) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           $R$0$i18$lcssa = $R$0$i18;$RP$0$i17$lcssa = $RP$0$i17;
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17$lcssa>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17$lcssa>>2] = 0;
          $R$1$i20 = $R$0$i18$lcssa;
          break;
         }
        } else {
         $355 = (($v$3$lcssa$i) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = (($356) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = (($353) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = (($v$3$lcssa$i) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = ((1552 + ($379<<2)|0) + 304|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[((1552 + 4|0))>>2]|0;
           $386 = $385 & $384;
           HEAP32[((1552 + 4|0))>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[((1552 + 16|0))>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = (($351) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = (($351) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[((1552 + 16|0))>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = (($R$1$i20) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = (($v$3$lcssa$i) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = (($R$1$i20) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = (($398) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = (($v$3$lcssa$i) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[((1552 + 16|0))>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = (($R$1$i20) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = (($404) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L204: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2338 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2338)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = ((1552 + ($424<<2)|0) + 40|0);
          $426 = HEAP32[1552>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          do {
           if ($429) {
            $430 = $426 | $427;
            HEAP32[1552>>2] = $430;
            $$sum14$pre$i = (($424) + 2)|0;
            $$pre$i25 = ((1552 + ($$sum14$pre$i<<2)|0) + 40|0);
            $$pre$phi$i26Z2D = $$pre$i25;$F5$0$i = $425;
           } else {
            $$sum17$i = (($424) + 2)|0;
            $431 = ((1552 + ($$sum17$i<<2)|0) + 40|0);
            $432 = HEAP32[$431>>2]|0;
            $433 = HEAP32[((1552 + 16|0))>>2]|0;
            $434 = ($432>>>0)<($433>>>0);
            if (!($434)) {
             $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
             break;
            }
            _abort();
            // unreachable;
           }
          } while(0);
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = (($F5$0$i) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = ((1552 + ($I7$0$i<<2)|0) + 304|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[((1552 + 4|0))>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[((1552 + 4|0))>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ($I7$0$i|0)==(31);
         if ($476) {
          $484 = 0;
         } else {
          $477 = $I7$0$i >>> 1;
          $478 = (25 - ($477))|0;
          $484 = $478;
         }
         $479 = (($475) + 4|0);
         $480 = HEAP32[$479>>2]|0;
         $481 = $480 & -8;
         $482 = ($481|0)==($rsize$3$lcssa$i|0);
         L225: do {
          if ($482) {
           $T$0$lcssa$i = $475;
          } else {
           $483 = $rsize$3$lcssa$i << $484;
           $K12$029$i = $483;$T$028$i = $475;
           while(1) {
            $491 = $K12$029$i >>> 31;
            $492 = ((($T$028$i) + ($491<<2)|0) + 16|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             $$lcssa134 = $492;$T$028$i$lcssa = $T$028$i;
             break;
            }
            $485 = $K12$029$i << 1;
            $486 = (($487) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L225;
            } else {
             $K12$029$i = $485;$T$028$i = $487;
            }
           }
           $494 = HEAP32[((1552 + 16|0))>>2]|0;
           $495 = ($$lcssa134>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$$lcssa134>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$028$i$lcssa;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L204;
           }
          }
         } while(0);
         $499 = (($T$0$lcssa$i) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[((1552 + 16|0))>>2]|0;
         $502 = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = ($500>>>0)>=($501>>>0);
         $or$cond24$i = $502 & $503;
         if ($or$cond24$i) {
          $504 = (($500) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = (($v$3$lcssa$i) + 8|0);
       $mem$0 = $508;
       STACKTOP = sp;return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[((1552 + 8|0))>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[((1552 + 20|0))>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[((1552 + 20|0))>>2] = $514;
   HEAP32[((1552 + 8|0))>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = (($512) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[((1552 + 8|0))>>2] = 0;
   HEAP32[((1552 + 20|0))>>2] = 0;
   $520 = $509 | 3;
   $521 = (($512) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = (($512) + 8|0);
  $mem$0 = $525;
  STACKTOP = sp;return ($mem$0|0);
 }
 $526 = HEAP32[((1552 + 12|0))>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[((1552 + 12|0))>>2] = $528;
  $529 = HEAP32[((1552 + 24|0))>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[((1552 + 24|0))>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = (($529) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = (($529) + 8|0);
  $mem$0 = $535;
  STACKTOP = sp;return ($mem$0|0);
 }
 $536 = HEAP32[2024>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[((2024 + 8|0))>>2] = $538;
    HEAP32[((2024 + 4|0))>>2] = $538;
    HEAP32[((2024 + 12|0))>>2] = -1;
    HEAP32[((2024 + 16|0))>>2] = -1;
    HEAP32[((2024 + 20|0))>>2] = 0;
    HEAP32[((1552 + 444|0))>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[2024>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[((2024 + 8|0))>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  STACKTOP = sp;return ($mem$0|0);
 }
 $552 = HEAP32[((1552 + 440|0))>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[((1552 + 432|0))>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $558 = HEAP32[((1552 + 444|0))>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L266: do {
  if ($560) {
   $561 = HEAP32[((1552 + 24|0))>>2]|0;
   $562 = ($561|0)==(0|0);
   L268: do {
    if ($562) {
     label = 181;
    } else {
     $sp$0$i$i = ((1552 + 448|0));
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = (($sp$0$i$i) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        $$lcssa130 = $sp$0$i$i;$$lcssa132 = $565;$sp$0$i$i$lcssa = $sp$0$i$i;
        break;
       }
      }
      $569 = (($sp$0$i$i) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 181;
       break L268;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $572 = ($sp$0$i$i$lcssa|0)==(0|0);
     if ($572) {
      label = 181;
     } else {
      $595 = HEAP32[((1552 + 12|0))>>2]|0;
      $596 = (($548) - ($595))|0;
      $597 = $596 & $549;
      $598 = ($597>>>0)<(2147483647);
      if ($598) {
       $599 = (_sbrk(($597|0))|0);
       $600 = HEAP32[$$lcssa130>>2]|0;
       $601 = HEAP32[$$lcssa132>>2]|0;
       $602 = (($600) + ($601)|0);
       $603 = ($599|0)==($602|0);
       if ($603) {
        $br$0$i = $599;$ssize$1$i = $597;
        label = 190;
       } else {
        $br$030$i = $599;$ssize$129$i = $597;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 181) {
     $573 = (_sbrk(0)|0);
     $574 = ($573|0)==((-1)|0);
     if ($574) {
      $tsize$03141$i = 0;
     } else {
      $575 = $573;
      $576 = HEAP32[((2024 + 4|0))>>2]|0;
      $577 = (($576) + -1)|0;
      $578 = $577 & $575;
      $579 = ($578|0)==(0);
      if ($579) {
       $ssize$0$i = $550;
      } else {
       $580 = (($577) + ($575))|0;
       $581 = (0 - ($576))|0;
       $582 = $580 & $581;
       $583 = (($550) - ($575))|0;
       $584 = (($583) + ($582))|0;
       $ssize$0$i = $584;
      }
      $585 = HEAP32[((1552 + 432|0))>>2]|0;
      $586 = (($585) + ($ssize$0$i))|0;
      $587 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $588 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i29 = $587 & $588;
      if ($or$cond$i29) {
       $589 = HEAP32[((1552 + 440|0))>>2]|0;
       $590 = ($589|0)==(0);
       if (!($590)) {
        $591 = ($586>>>0)<=($585>>>0);
        $592 = ($586>>>0)>($589>>>0);
        $or$cond2$i = $591 | $592;
        if ($or$cond2$i) {
         $tsize$03141$i = 0;
         break;
        }
       }
       $593 = (_sbrk(($ssize$0$i|0))|0);
       $594 = ($593|0)==($573|0);
       if ($594) {
        $br$0$i = $573;$ssize$1$i = $ssize$0$i;
        label = 190;
       } else {
        $br$030$i = $593;$ssize$129$i = $ssize$0$i;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   L288: do {
    if ((label|0) == 190) {
     $604 = ($br$0$i|0)==((-1)|0);
     if ($604) {
      $tsize$03141$i = $ssize$1$i;
     } else {
      $tbase$245$i = $br$0$i;$tsize$244$i = $ssize$1$i;
      label = 201;
      break L266;
     }
    }
    else if ((label|0) == 191) {
     $605 = (0 - ($ssize$129$i))|0;
     $606 = ($br$030$i|0)!=((-1)|0);
     $607 = ($ssize$129$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $607;
     $608 = ($545>>>0)>($ssize$129$i>>>0);
     $or$cond4$i = $or$cond5$i & $608;
     do {
      if ($or$cond4$i) {
       $609 = HEAP32[((2024 + 8|0))>>2]|0;
       $610 = (($547) - ($ssize$129$i))|0;
       $611 = (($610) + ($609))|0;
       $612 = (0 - ($609))|0;
       $613 = $611 & $612;
       $614 = ($613>>>0)<(2147483647);
       if ($614) {
        $615 = (_sbrk(($613|0))|0);
        $616 = ($615|0)==((-1)|0);
        if ($616) {
         (_sbrk(($605|0))|0);
         $tsize$03141$i = 0;
         break L288;
        } else {
         $617 = (($613) + ($ssize$129$i))|0;
         $ssize$2$i = $617;
         break;
        }
       } else {
        $ssize$2$i = $ssize$129$i;
       }
      } else {
       $ssize$2$i = $ssize$129$i;
      }
     } while(0);
     $618 = ($br$030$i|0)==((-1)|0);
     if ($618) {
      $tsize$03141$i = 0;
     } else {
      $tbase$245$i = $br$030$i;$tsize$244$i = $ssize$2$i;
      label = 201;
      break L266;
     }
    }
   } while(0);
   $619 = HEAP32[((1552 + 444|0))>>2]|0;
   $620 = $619 | 4;
   HEAP32[((1552 + 444|0))>>2] = $620;
   $tsize$1$i = $tsize$03141$i;
   label = 198;
  } else {
   $tsize$1$i = 0;
   label = 198;
  }
 } while(0);
 if ((label|0) == 198) {
  $621 = ($550>>>0)<(2147483647);
  if ($621) {
   $622 = (_sbrk(($550|0))|0);
   $623 = (_sbrk(0)|0);
   $624 = ($622|0)!=((-1)|0);
   $625 = ($623|0)!=((-1)|0);
   $or$cond3$i = $624 & $625;
   $626 = ($622>>>0)<($623>>>0);
   $or$cond6$i = $or$cond3$i & $626;
   if ($or$cond6$i) {
    $627 = $623;
    $628 = $622;
    $629 = (($627) - ($628))|0;
    $630 = (($nb$0) + 40)|0;
    $631 = ($629>>>0)>($630>>>0);
    $$tsize$1$i = $631 ? $629 : $tsize$1$i;
    if ($631) {
     $tbase$245$i = $622;$tsize$244$i = $$tsize$1$i;
     label = 201;
    }
   }
  }
 }
 if ((label|0) == 201) {
  $632 = HEAP32[((1552 + 432|0))>>2]|0;
  $633 = (($632) + ($tsize$244$i))|0;
  HEAP32[((1552 + 432|0))>>2] = $633;
  $634 = HEAP32[((1552 + 436|0))>>2]|0;
  $635 = ($633>>>0)>($634>>>0);
  if ($635) {
   HEAP32[((1552 + 436|0))>>2] = $633;
  }
  $636 = HEAP32[((1552 + 24|0))>>2]|0;
  $637 = ($636|0)==(0|0);
  L308: do {
   if ($637) {
    $638 = HEAP32[((1552 + 16|0))>>2]|0;
    $639 = ($638|0)==(0|0);
    $640 = ($tbase$245$i>>>0)<($638>>>0);
    $or$cond8$i = $639 | $640;
    if ($or$cond8$i) {
     HEAP32[((1552 + 16|0))>>2] = $tbase$245$i;
    }
    HEAP32[((1552 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((1552 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((1552 + 460|0))>>2] = 0;
    $641 = HEAP32[2024>>2]|0;
    HEAP32[((1552 + 36|0))>>2] = $641;
    HEAP32[((1552 + 32|0))>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $642 = $i$02$i$i << 1;
     $643 = ((1552 + ($642<<2)|0) + 40|0);
     $$sum$i$i = (($642) + 3)|0;
     $644 = ((1552 + ($$sum$i$i<<2)|0) + 40|0);
     HEAP32[$644>>2] = $643;
     $$sum1$i$i = (($642) + 2)|0;
     $645 = ((1552 + ($$sum1$i$i<<2)|0) + 40|0);
     HEAP32[$645>>2] = $643;
     $646 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($646|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $646;
     }
    }
    $647 = (($tsize$244$i) + -40)|0;
    $648 = (($tbase$245$i) + 8|0);
    $649 = $648;
    $650 = $649 & 7;
    $651 = ($650|0)==(0);
    if ($651) {
     $655 = 0;
    } else {
     $652 = (0 - ($649))|0;
     $653 = $652 & 7;
     $655 = $653;
    }
    $654 = (($tbase$245$i) + ($655)|0);
    $656 = (($647) - ($655))|0;
    HEAP32[((1552 + 24|0))>>2] = $654;
    HEAP32[((1552 + 12|0))>>2] = $656;
    $657 = $656 | 1;
    $$sum$i12$i = (($655) + 4)|0;
    $658 = (($tbase$245$i) + ($$sum$i12$i)|0);
    HEAP32[$658>>2] = $657;
    $$sum2$i$i = (($tsize$244$i) + -36)|0;
    $659 = (($tbase$245$i) + ($$sum2$i$i)|0);
    HEAP32[$659>>2] = 40;
    $660 = HEAP32[((2024 + 16|0))>>2]|0;
    HEAP32[((1552 + 28|0))>>2] = $660;
   } else {
    $sp$074$i = ((1552 + 448|0));
    while(1) {
     $661 = HEAP32[$sp$074$i>>2]|0;
     $662 = (($sp$074$i) + 4|0);
     $663 = HEAP32[$662>>2]|0;
     $664 = (($661) + ($663)|0);
     $665 = ($tbase$245$i|0)==($664|0);
     if ($665) {
      $$lcssa123 = $661;$$lcssa125 = $662;$$lcssa127 = $663;$sp$074$i$lcssa = $sp$074$i;
      label = 213;
      break;
     }
     $666 = (($sp$074$i) + 8|0);
     $667 = HEAP32[$666>>2]|0;
     $668 = ($667|0)==(0|0);
     if ($668) {
      break;
     } else {
      $sp$074$i = $667;
     }
    }
    if ((label|0) == 213) {
     $669 = (($sp$074$i$lcssa) + 12|0);
     $670 = HEAP32[$669>>2]|0;
     $671 = $670 & 8;
     $672 = ($671|0)==(0);
     if ($672) {
      $673 = ($636>>>0)>=($$lcssa123>>>0);
      $674 = ($636>>>0)<($tbase$245$i>>>0);
      $or$cond47$i = $673 & $674;
      if ($or$cond47$i) {
       $675 = (($$lcssa127) + ($tsize$244$i))|0;
       HEAP32[$$lcssa125>>2] = $675;
       $676 = HEAP32[((1552 + 12|0))>>2]|0;
       $677 = (($676) + ($tsize$244$i))|0;
       $678 = (($636) + 8|0);
       $679 = $678;
       $680 = $679 & 7;
       $681 = ($680|0)==(0);
       if ($681) {
        $685 = 0;
       } else {
        $682 = (0 - ($679))|0;
        $683 = $682 & 7;
        $685 = $683;
       }
       $684 = (($636) + ($685)|0);
       $686 = (($677) - ($685))|0;
       HEAP32[((1552 + 24|0))>>2] = $684;
       HEAP32[((1552 + 12|0))>>2] = $686;
       $687 = $686 | 1;
       $$sum$i16$i = (($685) + 4)|0;
       $688 = (($636) + ($$sum$i16$i)|0);
       HEAP32[$688>>2] = $687;
       $$sum2$i17$i = (($677) + 4)|0;
       $689 = (($636) + ($$sum2$i17$i)|0);
       HEAP32[$689>>2] = 40;
       $690 = HEAP32[((2024 + 16|0))>>2]|0;
       HEAP32[((1552 + 28|0))>>2] = $690;
       break;
      }
     }
    }
    $691 = HEAP32[((1552 + 16|0))>>2]|0;
    $692 = ($tbase$245$i>>>0)<($691>>>0);
    if ($692) {
     HEAP32[((1552 + 16|0))>>2] = $tbase$245$i;
     $756 = $tbase$245$i;
    } else {
     $756 = $691;
    }
    $693 = (($tbase$245$i) + ($tsize$244$i)|0);
    $sp$173$i = ((1552 + 448|0));
    while(1) {
     $694 = HEAP32[$sp$173$i>>2]|0;
     $695 = ($694|0)==($693|0);
     if ($695) {
      $$lcssa120 = $sp$173$i;$sp$173$i$lcssa = $sp$173$i;
      label = 223;
      break;
     }
     $696 = (($sp$173$i) + 8|0);
     $697 = HEAP32[$696>>2]|0;
     $698 = ($697|0)==(0|0);
     if ($698) {
      break;
     } else {
      $sp$173$i = $697;
     }
    }
    if ((label|0) == 223) {
     $699 = (($sp$173$i$lcssa) + 12|0);
     $700 = HEAP32[$699>>2]|0;
     $701 = $700 & 8;
     $702 = ($701|0)==(0);
     if ($702) {
      HEAP32[$$lcssa120>>2] = $tbase$245$i;
      $703 = (($sp$173$i$lcssa) + 4|0);
      $704 = HEAP32[$703>>2]|0;
      $705 = (($704) + ($tsize$244$i))|0;
      HEAP32[$703>>2] = $705;
      $706 = (($tbase$245$i) + 8|0);
      $707 = $706;
      $708 = $707 & 7;
      $709 = ($708|0)==(0);
      if ($709) {
       $713 = 0;
      } else {
       $710 = (0 - ($707))|0;
       $711 = $710 & 7;
       $713 = $711;
      }
      $712 = (($tbase$245$i) + ($713)|0);
      $$sum102$i = (($tsize$244$i) + 8)|0;
      $714 = (($tbase$245$i) + ($$sum102$i)|0);
      $715 = $714;
      $716 = $715 & 7;
      $717 = ($716|0)==(0);
      if ($717) {
       $720 = 0;
      } else {
       $718 = (0 - ($715))|0;
       $719 = $718 & 7;
       $720 = $719;
      }
      $$sum103$i = (($720) + ($tsize$244$i))|0;
      $721 = (($tbase$245$i) + ($$sum103$i)|0);
      $722 = $721;
      $723 = $712;
      $724 = (($722) - ($723))|0;
      $$sum$i19$i = (($713) + ($nb$0))|0;
      $725 = (($tbase$245$i) + ($$sum$i19$i)|0);
      $726 = (($724) - ($nb$0))|0;
      $727 = $nb$0 | 3;
      $$sum1$i20$i = (($713) + 4)|0;
      $728 = (($tbase$245$i) + ($$sum1$i20$i)|0);
      HEAP32[$728>>2] = $727;
      $729 = ($721|0)==($636|0);
      L345: do {
       if ($729) {
        $730 = HEAP32[((1552 + 12|0))>>2]|0;
        $731 = (($730) + ($726))|0;
        HEAP32[((1552 + 12|0))>>2] = $731;
        HEAP32[((1552 + 24|0))>>2] = $725;
        $732 = $731 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $733 = (($tbase$245$i) + ($$sum42$i$i)|0);
        HEAP32[$733>>2] = $732;
       } else {
        $734 = HEAP32[((1552 + 20|0))>>2]|0;
        $735 = ($721|0)==($734|0);
        if ($735) {
         $736 = HEAP32[((1552 + 8|0))>>2]|0;
         $737 = (($736) + ($726))|0;
         HEAP32[((1552 + 8|0))>>2] = $737;
         HEAP32[((1552 + 20|0))>>2] = $725;
         $738 = $737 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $739 = (($tbase$245$i) + ($$sum40$i$i)|0);
         HEAP32[$739>>2] = $738;
         $$sum41$i$i = (($737) + ($$sum$i19$i))|0;
         $740 = (($tbase$245$i) + ($$sum41$i$i)|0);
         HEAP32[$740>>2] = $737;
         break;
        }
        $$sum2$i21$i = (($tsize$244$i) + 4)|0;
        $$sum104$i = (($$sum2$i21$i) + ($720))|0;
        $741 = (($tbase$245$i) + ($$sum104$i)|0);
        $742 = HEAP32[$741>>2]|0;
        $743 = $742 & 3;
        $744 = ($743|0)==(1);
        if ($744) {
         $745 = $742 & -8;
         $746 = $742 >>> 3;
         $747 = ($742>>>0)<(256);
         L353: do {
          if ($747) {
           $$sum3738$i$i = $720 | 8;
           $$sum114$i = (($$sum3738$i$i) + ($tsize$244$i))|0;
           $748 = (($tbase$245$i) + ($$sum114$i)|0);
           $749 = HEAP32[$748>>2]|0;
           $$sum39$i$i = (($tsize$244$i) + 12)|0;
           $$sum115$i = (($$sum39$i$i) + ($720))|0;
           $750 = (($tbase$245$i) + ($$sum115$i)|0);
           $751 = HEAP32[$750>>2]|0;
           $752 = $746 << 1;
           $753 = ((1552 + ($752<<2)|0) + 40|0);
           $754 = ($749|0)==($753|0);
           do {
            if (!($754)) {
             $755 = ($749>>>0)<($756>>>0);
             if ($755) {
              _abort();
              // unreachable;
             }
             $757 = (($749) + 12|0);
             $758 = HEAP32[$757>>2]|0;
             $759 = ($758|0)==($721|0);
             if ($759) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $760 = ($751|0)==($749|0);
           if ($760) {
            $761 = 1 << $746;
            $762 = $761 ^ -1;
            $763 = HEAP32[1552>>2]|0;
            $764 = $763 & $762;
            HEAP32[1552>>2] = $764;
            break;
           }
           $765 = ($751|0)==($753|0);
           do {
            if ($765) {
             $$pre58$i$i = (($751) + 8|0);
             $$pre$phi59$i$iZ2D = $$pre58$i$i;
            } else {
             $766 = ($751>>>0)<($756>>>0);
             if ($766) {
              _abort();
              // unreachable;
             }
             $767 = (($751) + 8|0);
             $768 = HEAP32[$767>>2]|0;
             $769 = ($768|0)==($721|0);
             if ($769) {
              $$pre$phi59$i$iZ2D = $767;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $770 = (($749) + 12|0);
           HEAP32[$770>>2] = $751;
           HEAP32[$$pre$phi59$i$iZ2D>>2] = $749;
          } else {
           $$sum34$i$i = $720 | 24;
           $$sum105$i = (($$sum34$i$i) + ($tsize$244$i))|0;
           $771 = (($tbase$245$i) + ($$sum105$i)|0);
           $772 = HEAP32[$771>>2]|0;
           $$sum5$i$i = (($tsize$244$i) + 12)|0;
           $$sum106$i = (($$sum5$i$i) + ($720))|0;
           $773 = (($tbase$245$i) + ($$sum106$i)|0);
           $774 = HEAP32[$773>>2]|0;
           $775 = ($774|0)==($721|0);
           do {
            if ($775) {
             $$sum67$i$i = $720 | 16;
             $$sum112$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $785 = (($tbase$245$i) + ($$sum112$i)|0);
             $786 = HEAP32[$785>>2]|0;
             $787 = ($786|0)==(0|0);
             if ($787) {
              $$sum113$i = (($$sum67$i$i) + ($tsize$244$i))|0;
              $788 = (($tbase$245$i) + ($$sum113$i)|0);
              $789 = HEAP32[$788>>2]|0;
              $790 = ($789|0)==(0|0);
              if ($790) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $789;$RP$0$i$i = $788;
              }
             } else {
              $R$0$i$i = $786;$RP$0$i$i = $785;
             }
             while(1) {
              $791 = (($R$0$i$i) + 20|0);
              $792 = HEAP32[$791>>2]|0;
              $793 = ($792|0)==(0|0);
              if (!($793)) {
               $R$0$i$i = $792;$RP$0$i$i = $791;
               continue;
              }
              $794 = (($R$0$i$i) + 16|0);
              $795 = HEAP32[$794>>2]|0;
              $796 = ($795|0)==(0|0);
              if ($796) {
               $R$0$i$i$lcssa = $R$0$i$i;$RP$0$i$i$lcssa = $RP$0$i$i;
               break;
              } else {
               $R$0$i$i = $795;$RP$0$i$i = $794;
              }
             }
             $797 = ($RP$0$i$i$lcssa>>>0)<($756>>>0);
             if ($797) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i$lcssa>>2] = 0;
              $R$1$i$i = $R$0$i$i$lcssa;
              break;
             }
            } else {
             $$sum3536$i$i = $720 | 8;
             $$sum107$i = (($$sum3536$i$i) + ($tsize$244$i))|0;
             $776 = (($tbase$245$i) + ($$sum107$i)|0);
             $777 = HEAP32[$776>>2]|0;
             $778 = ($777>>>0)<($756>>>0);
             if ($778) {
              _abort();
              // unreachable;
             }
             $779 = (($777) + 12|0);
             $780 = HEAP32[$779>>2]|0;
             $781 = ($780|0)==($721|0);
             if (!($781)) {
              _abort();
              // unreachable;
             }
             $782 = (($774) + 8|0);
             $783 = HEAP32[$782>>2]|0;
             $784 = ($783|0)==($721|0);
             if ($784) {
              HEAP32[$779>>2] = $774;
              HEAP32[$782>>2] = $777;
              $R$1$i$i = $774;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $798 = ($772|0)==(0|0);
           if ($798) {
            break;
           }
           $$sum30$i$i = (($tsize$244$i) + 28)|0;
           $$sum108$i = (($$sum30$i$i) + ($720))|0;
           $799 = (($tbase$245$i) + ($$sum108$i)|0);
           $800 = HEAP32[$799>>2]|0;
           $801 = ((1552 + ($800<<2)|0) + 304|0);
           $802 = HEAP32[$801>>2]|0;
           $803 = ($721|0)==($802|0);
           do {
            if ($803) {
             HEAP32[$801>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $804 = 1 << $800;
             $805 = $804 ^ -1;
             $806 = HEAP32[((1552 + 4|0))>>2]|0;
             $807 = $806 & $805;
             HEAP32[((1552 + 4|0))>>2] = $807;
             break L353;
            } else {
             $808 = HEAP32[((1552 + 16|0))>>2]|0;
             $809 = ($772>>>0)<($808>>>0);
             if ($809) {
              _abort();
              // unreachable;
             }
             $810 = (($772) + 16|0);
             $811 = HEAP32[$810>>2]|0;
             $812 = ($811|0)==($721|0);
             if ($812) {
              HEAP32[$810>>2] = $R$1$i$i;
             } else {
              $813 = (($772) + 20|0);
              HEAP32[$813>>2] = $R$1$i$i;
             }
             $814 = ($R$1$i$i|0)==(0|0);
             if ($814) {
              break L353;
             }
            }
           } while(0);
           $815 = HEAP32[((1552 + 16|0))>>2]|0;
           $816 = ($R$1$i$i>>>0)<($815>>>0);
           if ($816) {
            _abort();
            // unreachable;
           }
           $817 = (($R$1$i$i) + 24|0);
           HEAP32[$817>>2] = $772;
           $$sum3132$i$i = $720 | 16;
           $$sum109$i = (($$sum3132$i$i) + ($tsize$244$i))|0;
           $818 = (($tbase$245$i) + ($$sum109$i)|0);
           $819 = HEAP32[$818>>2]|0;
           $820 = ($819|0)==(0|0);
           do {
            if (!($820)) {
             $821 = ($819>>>0)<($815>>>0);
             if ($821) {
              _abort();
              // unreachable;
             } else {
              $822 = (($R$1$i$i) + 16|0);
              HEAP32[$822>>2] = $819;
              $823 = (($819) + 24|0);
              HEAP32[$823>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum110$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $824 = (($tbase$245$i) + ($$sum110$i)|0);
           $825 = HEAP32[$824>>2]|0;
           $826 = ($825|0)==(0|0);
           if ($826) {
            break;
           }
           $827 = HEAP32[((1552 + 16|0))>>2]|0;
           $828 = ($825>>>0)<($827>>>0);
           if ($828) {
            _abort();
            // unreachable;
           } else {
            $829 = (($R$1$i$i) + 20|0);
            HEAP32[$829>>2] = $825;
            $830 = (($825) + 24|0);
            HEAP32[$830>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $745 | $720;
         $$sum111$i = (($$sum9$i$i) + ($tsize$244$i))|0;
         $831 = (($tbase$245$i) + ($$sum111$i)|0);
         $832 = (($745) + ($726))|0;
         $oldfirst$0$i$i = $831;$qsize$0$i$i = $832;
        } else {
         $oldfirst$0$i$i = $721;$qsize$0$i$i = $726;
        }
        $833 = (($oldfirst$0$i$i) + 4|0);
        $834 = HEAP32[$833>>2]|0;
        $835 = $834 & -2;
        HEAP32[$833>>2] = $835;
        $836 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $837 = (($tbase$245$i) + ($$sum10$i$i)|0);
        HEAP32[$837>>2] = $836;
        $$sum11$i22$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $838 = (($tbase$245$i) + ($$sum11$i22$i)|0);
        HEAP32[$838>>2] = $qsize$0$i$i;
        $839 = $qsize$0$i$i >>> 3;
        $840 = ($qsize$0$i$i>>>0)<(256);
        if ($840) {
         $841 = $839 << 1;
         $842 = ((1552 + ($841<<2)|0) + 40|0);
         $843 = HEAP32[1552>>2]|0;
         $844 = 1 << $839;
         $845 = $843 & $844;
         $846 = ($845|0)==(0);
         do {
          if ($846) {
           $847 = $843 | $844;
           HEAP32[1552>>2] = $847;
           $$sum26$pre$i$i = (($841) + 2)|0;
           $$pre$i23$i = ((1552 + ($$sum26$pre$i$i<<2)|0) + 40|0);
           $$pre$phi$i24$iZ2D = $$pre$i23$i;$F4$0$i$i = $842;
          } else {
           $$sum29$i$i = (($841) + 2)|0;
           $848 = ((1552 + ($$sum29$i$i<<2)|0) + 40|0);
           $849 = HEAP32[$848>>2]|0;
           $850 = HEAP32[((1552 + 16|0))>>2]|0;
           $851 = ($849>>>0)<($850>>>0);
           if (!($851)) {
            $$pre$phi$i24$iZ2D = $848;$F4$0$i$i = $849;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i24$iZ2D>>2] = $725;
         $852 = (($F4$0$i$i) + 12|0);
         HEAP32[$852>>2] = $725;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $853 = (($tbase$245$i) + ($$sum27$i$i)|0);
         HEAP32[$853>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $854 = (($tbase$245$i) + ($$sum28$i$i)|0);
         HEAP32[$854>>2] = $842;
         break;
        }
        $855 = $qsize$0$i$i >>> 8;
        $856 = ($855|0)==(0);
        do {
         if ($856) {
          $I7$0$i$i = 0;
         } else {
          $857 = ($qsize$0$i$i>>>0)>(16777215);
          if ($857) {
           $I7$0$i$i = 31;
           break;
          }
          $858 = (($855) + 1048320)|0;
          $859 = $858 >>> 16;
          $860 = $859 & 8;
          $861 = $855 << $860;
          $862 = (($861) + 520192)|0;
          $863 = $862 >>> 16;
          $864 = $863 & 4;
          $865 = $864 | $860;
          $866 = $861 << $864;
          $867 = (($866) + 245760)|0;
          $868 = $867 >>> 16;
          $869 = $868 & 2;
          $870 = $865 | $869;
          $871 = (14 - ($870))|0;
          $872 = $866 << $869;
          $873 = $872 >>> 15;
          $874 = (($871) + ($873))|0;
          $875 = $874 << 1;
          $876 = (($874) + 7)|0;
          $877 = $qsize$0$i$i >>> $876;
          $878 = $877 & 1;
          $879 = $878 | $875;
          $I7$0$i$i = $879;
         }
        } while(0);
        $880 = ((1552 + ($I7$0$i$i<<2)|0) + 304|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $881 = (($tbase$245$i) + ($$sum12$i$i)|0);
        HEAP32[$881>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $882 = (($tbase$245$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $883 = (($tbase$245$i) + ($$sum14$i$i)|0);
        HEAP32[$883>>2] = 0;
        HEAP32[$882>>2] = 0;
        $884 = HEAP32[((1552 + 4|0))>>2]|0;
        $885 = 1 << $I7$0$i$i;
        $886 = $884 & $885;
        $887 = ($886|0)==(0);
        if ($887) {
         $888 = $884 | $885;
         HEAP32[((1552 + 4|0))>>2] = $888;
         HEAP32[$880>>2] = $725;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $889 = (($tbase$245$i) + ($$sum15$i$i)|0);
         HEAP32[$889>>2] = $880;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $890 = (($tbase$245$i) + ($$sum16$i$i)|0);
         HEAP32[$890>>2] = $725;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $891 = (($tbase$245$i) + ($$sum17$i$i)|0);
         HEAP32[$891>>2] = $725;
         break;
        }
        $892 = HEAP32[$880>>2]|0;
        $893 = ($I7$0$i$i|0)==(31);
        if ($893) {
         $901 = 0;
        } else {
         $894 = $I7$0$i$i >>> 1;
         $895 = (25 - ($894))|0;
         $901 = $895;
        }
        $896 = (($892) + 4|0);
        $897 = HEAP32[$896>>2]|0;
        $898 = $897 & -8;
        $899 = ($898|0)==($qsize$0$i$i|0);
        L442: do {
         if ($899) {
          $T$0$lcssa$i26$i = $892;
         } else {
          $900 = $qsize$0$i$i << $901;
          $K8$053$i$i = $900;$T$052$i$i = $892;
          while(1) {
           $908 = $K8$053$i$i >>> 31;
           $909 = ((($T$052$i$i) + ($908<<2)|0) + 16|0);
           $904 = HEAP32[$909>>2]|0;
           $910 = ($904|0)==(0|0);
           if ($910) {
            $$lcssa = $909;$T$052$i$i$lcssa = $T$052$i$i;
            break;
           }
           $902 = $K8$053$i$i << 1;
           $903 = (($904) + 4|0);
           $905 = HEAP32[$903>>2]|0;
           $906 = $905 & -8;
           $907 = ($906|0)==($qsize$0$i$i|0);
           if ($907) {
            $T$0$lcssa$i26$i = $904;
            break L442;
           } else {
            $K8$053$i$i = $902;$T$052$i$i = $904;
           }
          }
          $911 = HEAP32[((1552 + 16|0))>>2]|0;
          $912 = ($$lcssa>>>0)<($911>>>0);
          if ($912) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$$lcssa>>2] = $725;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $913 = (($tbase$245$i) + ($$sum23$i$i)|0);
           HEAP32[$913>>2] = $T$052$i$i$lcssa;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $914 = (($tbase$245$i) + ($$sum24$i$i)|0);
           HEAP32[$914>>2] = $725;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $915 = (($tbase$245$i) + ($$sum25$i$i)|0);
           HEAP32[$915>>2] = $725;
           break L345;
          }
         }
        } while(0);
        $916 = (($T$0$lcssa$i26$i) + 8|0);
        $917 = HEAP32[$916>>2]|0;
        $918 = HEAP32[((1552 + 16|0))>>2]|0;
        $919 = ($T$0$lcssa$i26$i>>>0)>=($918>>>0);
        $920 = ($917>>>0)>=($918>>>0);
        $or$cond$i27$i = $919 & $920;
        if ($or$cond$i27$i) {
         $921 = (($917) + 12|0);
         HEAP32[$921>>2] = $725;
         HEAP32[$916>>2] = $725;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $922 = (($tbase$245$i) + ($$sum20$i$i)|0);
         HEAP32[$922>>2] = $917;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $923 = (($tbase$245$i) + ($$sum21$i$i)|0);
         HEAP32[$923>>2] = $T$0$lcssa$i26$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $924 = (($tbase$245$i) + ($$sum22$i$i)|0);
         HEAP32[$924>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $713 | 8;
      $925 = (($tbase$245$i) + ($$sum1819$i$i)|0);
      $mem$0 = $925;
      STACKTOP = sp;return ($mem$0|0);
     }
    }
    $sp$0$i$i$i = ((1552 + 448|0));
    while(1) {
     $926 = HEAP32[$sp$0$i$i$i>>2]|0;
     $927 = ($926>>>0)>($636>>>0);
     if (!($927)) {
      $928 = (($sp$0$i$i$i) + 4|0);
      $929 = HEAP32[$928>>2]|0;
      $930 = (($926) + ($929)|0);
      $931 = ($930>>>0)>($636>>>0);
      if ($931) {
       $$lcssa116 = $926;$$lcssa117 = $929;$$lcssa118 = $930;
       break;
      }
     }
     $932 = (($sp$0$i$i$i) + 8|0);
     $933 = HEAP32[$932>>2]|0;
     $sp$0$i$i$i = $933;
    }
    $$sum$i13$i = (($$lcssa117) + -47)|0;
    $$sum1$i14$i = (($$lcssa117) + -39)|0;
    $934 = (($$lcssa116) + ($$sum1$i14$i)|0);
    $935 = $934;
    $936 = $935 & 7;
    $937 = ($936|0)==(0);
    if ($937) {
     $940 = 0;
    } else {
     $938 = (0 - ($935))|0;
     $939 = $938 & 7;
     $940 = $939;
    }
    $$sum2$i15$i = (($$sum$i13$i) + ($940))|0;
    $941 = (($$lcssa116) + ($$sum2$i15$i)|0);
    $942 = (($636) + 16|0);
    $943 = ($941>>>0)<($942>>>0);
    $944 = $943 ? $636 : $941;
    $945 = (($944) + 8|0);
    $946 = (($tsize$244$i) + -40)|0;
    $947 = (($tbase$245$i) + 8|0);
    $948 = $947;
    $949 = $948 & 7;
    $950 = ($949|0)==(0);
    if ($950) {
     $954 = 0;
    } else {
     $951 = (0 - ($948))|0;
     $952 = $951 & 7;
     $954 = $952;
    }
    $953 = (($tbase$245$i) + ($954)|0);
    $955 = (($946) - ($954))|0;
    HEAP32[((1552 + 24|0))>>2] = $953;
    HEAP32[((1552 + 12|0))>>2] = $955;
    $956 = $955 | 1;
    $$sum$i$i$i = (($954) + 4)|0;
    $957 = (($tbase$245$i) + ($$sum$i$i$i)|0);
    HEAP32[$957>>2] = $956;
    $$sum2$i$i$i = (($tsize$244$i) + -36)|0;
    $958 = (($tbase$245$i) + ($$sum2$i$i$i)|0);
    HEAP32[$958>>2] = 40;
    $959 = HEAP32[((2024 + 16|0))>>2]|0;
    HEAP32[((1552 + 28|0))>>2] = $959;
    $960 = (($944) + 4|0);
    HEAP32[$960>>2] = 27;
    ;HEAP32[$945+0>>2]=HEAP32[((1552 + 448|0))+0>>2]|0;HEAP32[$945+4>>2]=HEAP32[((1552 + 448|0))+4>>2]|0;HEAP32[$945+8>>2]=HEAP32[((1552 + 448|0))+8>>2]|0;HEAP32[$945+12>>2]=HEAP32[((1552 + 448|0))+12>>2]|0;
    HEAP32[((1552 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((1552 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((1552 + 460|0))>>2] = 0;
    HEAP32[((1552 + 456|0))>>2] = $945;
    $961 = (($944) + 28|0);
    HEAP32[$961>>2] = 7;
    $962 = (($944) + 32|0);
    $963 = ($962>>>0)<($$lcssa118>>>0);
    if ($963) {
     $965 = $961;
     while(1) {
      $964 = (($965) + 4|0);
      HEAP32[$964>>2] = 7;
      $966 = (($965) + 8|0);
      $967 = ($966>>>0)<($$lcssa118>>>0);
      if ($967) {
       $965 = $964;
      } else {
       break;
      }
     }
    }
    $968 = ($944|0)==($636|0);
    if (!($968)) {
     $969 = $944;
     $970 = $636;
     $971 = (($969) - ($970))|0;
     $972 = (($636) + ($971)|0);
     $$sum3$i$i = (($971) + 4)|0;
     $973 = (($636) + ($$sum3$i$i)|0);
     $974 = HEAP32[$973>>2]|0;
     $975 = $974 & -2;
     HEAP32[$973>>2] = $975;
     $976 = $971 | 1;
     $977 = (($636) + 4|0);
     HEAP32[$977>>2] = $976;
     HEAP32[$972>>2] = $971;
     $978 = $971 >>> 3;
     $979 = ($971>>>0)<(256);
     if ($979) {
      $980 = $978 << 1;
      $981 = ((1552 + ($980<<2)|0) + 40|0);
      $982 = HEAP32[1552>>2]|0;
      $983 = 1 << $978;
      $984 = $982 & $983;
      $985 = ($984|0)==(0);
      do {
       if ($985) {
        $986 = $982 | $983;
        HEAP32[1552>>2] = $986;
        $$sum10$pre$i$i = (($980) + 2)|0;
        $$pre$i$i = ((1552 + ($$sum10$pre$i$i<<2)|0) + 40|0);
        $$pre$phi$i$iZ2D = $$pre$i$i;$F$0$i$i = $981;
       } else {
        $$sum11$i$i = (($980) + 2)|0;
        $987 = ((1552 + ($$sum11$i$i<<2)|0) + 40|0);
        $988 = HEAP32[$987>>2]|0;
        $989 = HEAP32[((1552 + 16|0))>>2]|0;
        $990 = ($988>>>0)<($989>>>0);
        if (!($990)) {
         $$pre$phi$i$iZ2D = $987;$F$0$i$i = $988;
         break;
        }
        _abort();
        // unreachable;
       }
      } while(0);
      HEAP32[$$pre$phi$i$iZ2D>>2] = $636;
      $991 = (($F$0$i$i) + 12|0);
      HEAP32[$991>>2] = $636;
      $992 = (($636) + 8|0);
      HEAP32[$992>>2] = $F$0$i$i;
      $993 = (($636) + 12|0);
      HEAP32[$993>>2] = $981;
      break;
     }
     $994 = $971 >>> 8;
     $995 = ($994|0)==(0);
     if ($995) {
      $I1$0$i$i = 0;
     } else {
      $996 = ($971>>>0)>(16777215);
      if ($996) {
       $I1$0$i$i = 31;
      } else {
       $997 = (($994) + 1048320)|0;
       $998 = $997 >>> 16;
       $999 = $998 & 8;
       $1000 = $994 << $999;
       $1001 = (($1000) + 520192)|0;
       $1002 = $1001 >>> 16;
       $1003 = $1002 & 4;
       $1004 = $1003 | $999;
       $1005 = $1000 << $1003;
       $1006 = (($1005) + 245760)|0;
       $1007 = $1006 >>> 16;
       $1008 = $1007 & 2;
       $1009 = $1004 | $1008;
       $1010 = (14 - ($1009))|0;
       $1011 = $1005 << $1008;
       $1012 = $1011 >>> 15;
       $1013 = (($1010) + ($1012))|0;
       $1014 = $1013 << 1;
       $1015 = (($1013) + 7)|0;
       $1016 = $971 >>> $1015;
       $1017 = $1016 & 1;
       $1018 = $1017 | $1014;
       $I1$0$i$i = $1018;
      }
     }
     $1019 = ((1552 + ($I1$0$i$i<<2)|0) + 304|0);
     $1020 = (($636) + 28|0);
     $I1$0$c$i$i = $I1$0$i$i;
     HEAP32[$1020>>2] = $I1$0$c$i$i;
     $1021 = (($636) + 20|0);
     HEAP32[$1021>>2] = 0;
     $1022 = (($636) + 16|0);
     HEAP32[$1022>>2] = 0;
     $1023 = HEAP32[((1552 + 4|0))>>2]|0;
     $1024 = 1 << $I1$0$i$i;
     $1025 = $1023 & $1024;
     $1026 = ($1025|0)==(0);
     if ($1026) {
      $1027 = $1023 | $1024;
      HEAP32[((1552 + 4|0))>>2] = $1027;
      HEAP32[$1019>>2] = $636;
      $1028 = (($636) + 24|0);
      HEAP32[$1028>>2] = $1019;
      $1029 = (($636) + 12|0);
      HEAP32[$1029>>2] = $636;
      $1030 = (($636) + 8|0);
      HEAP32[$1030>>2] = $636;
      break;
     }
     $1031 = HEAP32[$1019>>2]|0;
     $1032 = ($I1$0$i$i|0)==(31);
     if ($1032) {
      $1040 = 0;
     } else {
      $1033 = $I1$0$i$i >>> 1;
      $1034 = (25 - ($1033))|0;
      $1040 = $1034;
     }
     $1035 = (($1031) + 4|0);
     $1036 = HEAP32[$1035>>2]|0;
     $1037 = $1036 & -8;
     $1038 = ($1037|0)==($971|0);
     L493: do {
      if ($1038) {
       $T$0$lcssa$i$i = $1031;
      } else {
       $1039 = $971 << $1040;
       $K2$015$i$i = $1039;$T$014$i$i = $1031;
       while(1) {
        $1047 = $K2$015$i$i >>> 31;
        $1048 = ((($T$014$i$i) + ($1047<<2)|0) + 16|0);
        $1043 = HEAP32[$1048>>2]|0;
        $1049 = ($1043|0)==(0|0);
        if ($1049) {
         $$lcssa112 = $1048;$T$014$i$i$lcssa = $T$014$i$i;
         break;
        }
        $1041 = $K2$015$i$i << 1;
        $1042 = (($1043) + 4|0);
        $1044 = HEAP32[$1042>>2]|0;
        $1045 = $1044 & -8;
        $1046 = ($1045|0)==($971|0);
        if ($1046) {
         $T$0$lcssa$i$i = $1043;
         break L493;
        } else {
         $K2$015$i$i = $1041;$T$014$i$i = $1043;
        }
       }
       $1050 = HEAP32[((1552 + 16|0))>>2]|0;
       $1051 = ($$lcssa112>>>0)<($1050>>>0);
       if ($1051) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$$lcssa112>>2] = $636;
        $1052 = (($636) + 24|0);
        HEAP32[$1052>>2] = $T$014$i$i$lcssa;
        $1053 = (($636) + 12|0);
        HEAP32[$1053>>2] = $636;
        $1054 = (($636) + 8|0);
        HEAP32[$1054>>2] = $636;
        break L308;
       }
      }
     } while(0);
     $1055 = (($T$0$lcssa$i$i) + 8|0);
     $1056 = HEAP32[$1055>>2]|0;
     $1057 = HEAP32[((1552 + 16|0))>>2]|0;
     $1058 = ($T$0$lcssa$i$i>>>0)>=($1057>>>0);
     $1059 = ($1056>>>0)>=($1057>>>0);
     $or$cond$i$i = $1058 & $1059;
     if ($or$cond$i$i) {
      $1060 = (($1056) + 12|0);
      HEAP32[$1060>>2] = $636;
      HEAP32[$1055>>2] = $636;
      $1061 = (($636) + 8|0);
      HEAP32[$1061>>2] = $1056;
      $1062 = (($636) + 12|0);
      HEAP32[$1062>>2] = $T$0$lcssa$i$i;
      $1063 = (($636) + 24|0);
      HEAP32[$1063>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1064 = HEAP32[((1552 + 12|0))>>2]|0;
  $1065 = ($1064>>>0)>($nb$0>>>0);
  if ($1065) {
   $1066 = (($1064) - ($nb$0))|0;
   HEAP32[((1552 + 12|0))>>2] = $1066;
   $1067 = HEAP32[((1552 + 24|0))>>2]|0;
   $1068 = (($1067) + ($nb$0)|0);
   HEAP32[((1552 + 24|0))>>2] = $1068;
   $1069 = $1066 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1070 = (($1067) + ($$sum$i32)|0);
   HEAP32[$1070>>2] = $1069;
   $1071 = $nb$0 | 3;
   $1072 = (($1067) + 4|0);
   HEAP32[$1072>>2] = $1071;
   $1073 = (($1067) + 8|0);
   $mem$0 = $1073;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $1074 = (___errno_location()|0);
 HEAP32[$1074>>2] = 12;
 $mem$0 = 0;
 STACKTOP = sp;return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$lcssa = 0, $$pre = 0, $$pre$phi66Z2D = 0, $$pre$phi68Z2D = 0, $$pre$phiZ2D = 0, $$pre65 = 0, $$pre67 = 0, $$sum = 0, $$sum16$pre = 0, $$sum17 = 0, $$sum18 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum2324 = 0, $$sum25 = 0, $$sum26 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0;
 var $$sum30 = 0, $$sum31 = 0, $$sum32 = 0, $$sum33 = 0, $$sum34 = 0, $$sum35 = 0, $$sum36 = 0, $$sum37 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0;
 var $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0;
 var $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0;
 var $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0;
 var $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0;
 var $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0;
 var $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0;
 var $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0;
 var $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0;
 var $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0;
 var $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0;
 var $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $I18$0$c = 0, $K19$060 = 0, $R$0 = 0, $R$0$lcssa = 0;
 var $R$1 = 0, $R7$0 = 0, $R7$0$lcssa = 0, $R7$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $RP9$0 = 0, $RP9$0$lcssa = 0, $T$0$lcssa = 0, $T$059 = 0, $T$059$lcssa = 0, $cond = 0, $cond54 = 0, $or$cond = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  STACKTOP = sp;return;
 }
 $1 = (($mem) + -8|0);
 $2 = HEAP32[((1552 + 16|0))>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = (($mem) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    STACKTOP = sp;return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[((1552 + 20|0))>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[((1552 + 8|0))>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum26 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum26)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    STACKTOP = sp;return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum36 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum36)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum37 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum37)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = ((1552 + ($25<<2)|0) + 40|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = (($22) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[1552>>2]|0;
     $36 = $35 & $34;
     HEAP32[1552>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre67 = (($24) + 8|0);
     $$pre$phi68Z2D = $$pre67;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = (($24) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi68Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = (($22) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi68Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum28 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum28)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum29 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum29)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum31 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum31)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum30 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum30)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = (($R$0) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = (($R$0) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       $R$0$lcssa = $R$0;$RP$0$lcssa = $RP$0;
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0$lcssa>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0$lcssa>>2] = 0;
      $R$1 = $R$0$lcssa;
      break;
     }
    } else {
     $$sum35 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum35)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = (($49) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = (($46) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum32 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum32)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = ((1552 + ($72<<2)|0) + 304|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[((1552 + 4|0))>>2]|0;
      $79 = $78 & $77;
      HEAP32[((1552 + 4|0))>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[((1552 + 16|0))>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = (($44) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = (($44) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[((1552 + 16|0))>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = (($R$1) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum33 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum33)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = (($R$1) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = (($91) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum34 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum34)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[((1552 + 16|0))>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = (($R$1) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = (($97) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum25 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum25)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[((1552 + 24|0))>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[((1552 + 12|0))>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[((1552 + 12|0))>>2] = $120;
   HEAP32[((1552 + 24|0))>>2] = $p$0;
   $121 = $120 | 1;
   $122 = (($p$0) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[((1552 + 20|0))>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    STACKTOP = sp;return;
   }
   HEAP32[((1552 + 20|0))>>2] = 0;
   HEAP32[((1552 + 8|0))>>2] = 0;
   STACKTOP = sp;return;
  }
  $125 = HEAP32[((1552 + 20|0))>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[((1552 + 8|0))>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[((1552 + 8|0))>>2] = $128;
   HEAP32[((1552 + 20|0))>>2] = $p$0;
   $129 = $128 | 1;
   $130 = (($p$0) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   STACKTOP = sp;return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum2324 = $8 | 4;
    $138 = (($mem) + ($$sum2324)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = ((1552 + ($140<<2)|0) + 40|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[((1552 + 16|0))>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = (($137) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[1552>>2]|0;
     $152 = $151 & $150;
     HEAP32[1552>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre65 = (($139) + 8|0);
     $$pre$phi66Z2D = $$pre65;
    } else {
     $154 = HEAP32[((1552 + 16|0))>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = (($139) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi66Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = (($137) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi66Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;$RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;$RP9$0 = $175;
      }
      while(1) {
       $181 = (($R7$0) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = (($R7$0) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        $R7$0$lcssa = $R7$0;$RP9$0$lcssa = $RP9$0;
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[((1552 + 16|0))>>2]|0;
      $188 = ($RP9$0$lcssa>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0$lcssa>>2] = 0;
       $R7$1 = $R7$0$lcssa;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[((1552 + 16|0))>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = (($166) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = (($163) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum18 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum18)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = ((1552 + ($191<<2)|0) + 304|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond54 = ($R7$1|0)==(0|0);
      if ($cond54) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[((1552 + 4|0))>>2]|0;
       $198 = $197 & $196;
       HEAP32[((1552 + 4|0))>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[((1552 + 16|0))>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = (($161) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = (($161) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[((1552 + 16|0))>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = (($R7$1) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum19 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum19)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = (($R7$1) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = (($210) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum20 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum20)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[((1552 + 16|0))>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = (($R7$1) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = (($216) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = (($p$0) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[((1552 + 20|0))>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[((1552 + 8|0))>>2] = $133;
   STACKTOP = sp;return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = (($p$0) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = ((1552 + ($233<<2)|0) + 40|0);
  $235 = HEAP32[1552>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[1552>>2] = $239;
   $$sum16$pre = (($233) + 2)|0;
   $$pre = ((1552 + ($$sum16$pre<<2)|0) + 40|0);
   $$pre$phiZ2D = $$pre;$F16$0 = $234;
  } else {
   $$sum17 = (($233) + 2)|0;
   $240 = ((1552 + ($$sum17<<2)|0) + 40|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[((1552 + 16|0))>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = (($F16$0) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = (($p$0) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = (($p$0) + 12|0);
  HEAP32[$246>>2] = $234;
  STACKTOP = sp;return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = ((1552 + ($I18$0<<2)|0) + 304|0);
 $273 = (($p$0) + 28|0);
 $I18$0$c = $I18$0;
 HEAP32[$273>>2] = $I18$0$c;
 $274 = (($p$0) + 20|0);
 HEAP32[$274>>2] = 0;
 $275 = (($p$0) + 16|0);
 HEAP32[$275>>2] = 0;
 $276 = HEAP32[((1552 + 4|0))>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[((1552 + 4|0))>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = (($p$0) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = (($p$0) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = (($p$0) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ($I18$0|0)==(31);
   if ($285) {
    $293 = 0;
   } else {
    $286 = $I18$0 >>> 1;
    $287 = (25 - ($286))|0;
    $293 = $287;
   }
   $288 = (($284) + 4|0);
   $289 = HEAP32[$288>>2]|0;
   $290 = $289 & -8;
   $291 = ($290|0)==($psize$1|0);
   L205: do {
    if ($291) {
     $T$0$lcssa = $284;
    } else {
     $292 = $psize$1 << $293;
     $K19$060 = $292;$T$059 = $284;
     while(1) {
      $300 = $K19$060 >>> 31;
      $301 = ((($T$059) + ($300<<2)|0) + 16|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       $$lcssa = $301;$T$059$lcssa = $T$059;
       break;
      }
      $294 = $K19$060 << 1;
      $295 = (($296) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L205;
      } else {
       $K19$060 = $294;$T$059 = $296;
      }
     }
     $303 = HEAP32[((1552 + 16|0))>>2]|0;
     $304 = ($$lcssa>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$$lcssa>>2] = $p$0;
      $305 = (($p$0) + 24|0);
      HEAP32[$305>>2] = $T$059$lcssa;
      $306 = (($p$0) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = (($p$0) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = (($T$0$lcssa) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[((1552 + 16|0))>>2]|0;
   $311 = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = ($309>>>0)>=($310>>>0);
   $or$cond = $311 & $312;
   if ($or$cond) {
    $313 = (($309) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = (($p$0) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = (($p$0) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = (($p$0) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[((1552 + 32|0))>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[((1552 + 32|0))>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = ((1552 + 456|0));
 } else {
  STACKTOP = sp;return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = (($sp$0$i) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[((1552 + 32|0))>>2] = -1;
 STACKTOP = sp;return;
}
function _frexp($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, $storemerge = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 if ((($4|0) == 2047)) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 } else if ((($4|0) == 0)) {
  $5 = $x != 0.0;
  if ($5) {
   $6 = $x * 1.8446744073709552E+19;
   $7 = (+_frexp($6,$e));
   $8 = HEAP32[$e>>2]|0;
   $9 = (($8) + -64)|0;
   $$01 = $7;$storemerge = $9;
  } else {
   $$01 = $x;$storemerge = 0;
  }
  HEAP32[$e>>2] = $storemerge;
  $$0 = $$01;
  STACKTOP = sp;return (+$$0);
 } else {
  $10 = (($4) + -1022)|0;
  HEAP32[$e>>2] = $10;
  $11 = $1 & -2146435073;
  $12 = $11 | 1071644672;
  HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $12;$13 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $13;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function _frexpl($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_frexp($x,$e));
 STACKTOP = sp;return (+$0);
}
function _wctomb($s,$wc) {
 $s = $s|0;
 $wc = $wc|0;
 var $$0 = 0, $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 if ($0) {
  $$0 = 0;
 } else {
  $1 = (_wcrtomb($s,$wc,0)|0);
  $$0 = $1;
 }
 STACKTOP = sp;return ($$0|0);
}
function _wcrtomb($s,$wc,$st) {
 $s = $s|0;
 $wc = $wc|0;
 $st = $st|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 if ($0) {
  $$0 = 1;
  STACKTOP = sp;return ($$0|0);
 }
 $1 = ($wc>>>0)<(128);
 if ($1) {
  $2 = $wc&255;
  HEAP8[$s>>0] = $2;
  $$0 = 1;
  STACKTOP = sp;return ($$0|0);
 }
 $3 = ($wc>>>0)<(2048);
 if ($3) {
  $4 = $wc >>> 6;
  $5 = $4 | 192;
  $6 = $5&255;
  $7 = (($s) + 1|0);
  HEAP8[$s>>0] = $6;
  $8 = $wc & 63;
  $9 = $8 | 128;
  $10 = $9&255;
  HEAP8[$7>>0] = $10;
  $$0 = 2;
  STACKTOP = sp;return ($$0|0);
 }
 $11 = ($wc>>>0)<(55296);
 $12 = $wc & -8192;
 $13 = ($12|0)==(57344);
 $or$cond = $11 | $13;
 if ($or$cond) {
  $14 = $wc >>> 12;
  $15 = $14 | 224;
  $16 = $15&255;
  $17 = (($s) + 1|0);
  HEAP8[$s>>0] = $16;
  $18 = $wc >>> 6;
  $19 = $18 & 63;
  $20 = $19 | 128;
  $21 = $20&255;
  $22 = (($s) + 2|0);
  HEAP8[$17>>0] = $21;
  $23 = $wc & 63;
  $24 = $23 | 128;
  $25 = $24&255;
  HEAP8[$22>>0] = $25;
  $$0 = 3;
  STACKTOP = sp;return ($$0|0);
 }
 $26 = (($wc) + -65536)|0;
 $27 = ($26>>>0)<(1048576);
 if ($27) {
  $28 = $wc >>> 18;
  $29 = $28 | 240;
  $30 = $29&255;
  $31 = (($s) + 1|0);
  HEAP8[$s>>0] = $30;
  $32 = $wc >>> 12;
  $33 = $32 & 63;
  $34 = $33 | 128;
  $35 = $34&255;
  $36 = (($s) + 2|0);
  HEAP8[$31>>0] = $35;
  $37 = $wc >>> 6;
  $38 = $37 & 63;
  $39 = $38 | 128;
  $40 = $39&255;
  $41 = (($s) + 3|0);
  HEAP8[$36>>0] = $40;
  $42 = $wc & 63;
  $43 = $42 | 128;
  $44 = $43&255;
  HEAP8[$41>>0] = $44;
  $$0 = 4;
  STACKTOP = sp;return ($$0|0);
 } else {
  $45 = (___errno_location()|0);
  HEAP32[$45>>2] = 84;
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function ___towrite($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 74|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $1 << 24 >> 24;
 $3 = (($2) + 255)|0;
 $4 = $3 | $2;
 $5 = $4&255;
 HEAP8[$0>>0] = $5;
 $6 = HEAP32[$f>>2]|0;
 $7 = $6 & 8;
 $8 = ($7|0)==(0);
 if ($8) {
  $10 = (($f) + 8|0);
  HEAP32[$10>>2] = 0;
  $11 = (($f) + 4|0);
  HEAP32[$11>>2] = 0;
  $12 = (($f) + 44|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = (($f) + 28|0);
  HEAP32[$14>>2] = $13;
  $15 = (($f) + 20|0);
  HEAP32[$15>>2] = $13;
  $16 = (($f) + 48|0);
  $17 = HEAP32[$16>>2]|0;
  $18 = (($13) + ($17)|0);
  $19 = (($f) + 16|0);
  HEAP32[$19>>2] = $18;
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 } else {
  $9 = $6 | 32;
  HEAP32[$f>>2] = $9;
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function ___fwritex($s,$l,$f) {
 $s = $s|0;
 $l = $l|0;
 $f = $f|0;
 var $$0 = 0, $$01 = 0, $$02 = 0, $$pre = 0, $$pre6 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$0 = 0, $i$0$lcssa7 = 0;
 var $i$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 do {
  if ($2) {
   $3 = (___towrite($f)|0);
   $4 = ($3|0)==(0);
   if ($4) {
    $$pre = HEAP32[$0>>2]|0;
    $8 = $$pre;
    break;
   } else {
    $$0 = 0;
    STACKTOP = sp;return ($$0|0);
   }
  } else {
   $8 = $1;
  }
 } while(0);
 $5 = (($f) + 20|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = $8;
 $9 = $6;
 $10 = (($7) - ($9))|0;
 $11 = ($10>>>0)<($l>>>0);
 if ($11) {
  $12 = (($f) + 36|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = (FUNCTION_TABLE_iiii[$13 & 1]($f,$s,$l)|0);
  $$0 = $14;
  STACKTOP = sp;return ($$0|0);
 }
 $15 = (($f) + 75|0);
 $16 = HEAP8[$15>>0]|0;
 $17 = ($16<<24>>24)>(-1);
 L11: do {
  if ($17) {
   $i$0 = $l;
   while(1) {
    $18 = ($i$0|0)==(0);
    if ($18) {
     $$01 = $l;$$02 = $s;$29 = $6;$i$1 = 0;
     break L11;
    }
    $19 = (($i$0) + -1)|0;
    $20 = (($s) + ($19)|0);
    $21 = HEAP8[$20>>0]|0;
    $22 = ($21<<24>>24)==(10);
    if ($22) {
     $i$0$lcssa7 = $i$0;
     break;
    } else {
     $i$0 = $19;
    }
   }
   $23 = (($f) + 36|0);
   $24 = HEAP32[$23>>2]|0;
   $25 = (FUNCTION_TABLE_iiii[$24 & 1]($f,$s,$i$0$lcssa7)|0);
   $26 = ($25>>>0)<($i$0$lcssa7>>>0);
   if ($26) {
    $$0 = $i$0$lcssa7;
    STACKTOP = sp;return ($$0|0);
   } else {
    $27 = (($s) + ($i$0$lcssa7)|0);
    $28 = (($l) - ($i$0$lcssa7))|0;
    $$pre6 = HEAP32[$5>>2]|0;
    $$01 = $28;$$02 = $27;$29 = $$pre6;$i$1 = $i$0$lcssa7;
    break;
   }
  } else {
   $$01 = $l;$$02 = $s;$29 = $6;$i$1 = 0;
  }
 } while(0);
 _memcpy(($29|0),($$02|0),($$01|0))|0;
 $30 = HEAP32[$5>>2]|0;
 $31 = (($30) + ($$01)|0);
 HEAP32[$5>>2] = $31;
 $32 = (($i$1) + ($$01))|0;
 $$0 = $32;
 STACKTOP = sp;return ($$0|0);
}
function _sprintf($s,$fmt,$varargs) {
 $s = $s|0;
 $fmt = $fmt|0;
 $varargs = $varargs|0;
 var $0 = 0, $ap = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $ap = sp;
 HEAP32[$ap>>2] = $varargs;
 $0 = (_vsprintf($s,$fmt,$ap)|0);
 STACKTOP = sp;return ($0|0);
}
function _MUSL_vfprintf($f,$fmt,$ap) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $$ = 0, $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $ap2 = 0, $internal_buf = 0, $nl_arg = 0, $nl_type = 0, $ret$1 = 0, $vacopy_currentptr = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0;
 $ap2 = sp + 120|0;
 $nl_type = sp + 80|0;
 $nl_arg = sp;
 $internal_buf = sp + 136|0;
 dest=$nl_type+0|0; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $vacopy_currentptr = HEAP32[$ap>>2]|0;
 HEAP32[$ap2>>2] = $vacopy_currentptr;
 $0 = (_printf_core(0,$fmt,$ap2,$nl_arg,$nl_type)|0);
 $1 = ($0|0)<(0);
 if ($1) {
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 $2 = (($f) + 48|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)==(0);
 if ($4) {
  $6 = (($f) + 44|0);
  $7 = HEAP32[$6>>2]|0;
  HEAP32[$6>>2] = $internal_buf;
  $8 = (($f) + 28|0);
  HEAP32[$8>>2] = $internal_buf;
  $9 = (($f) + 20|0);
  HEAP32[$9>>2] = $internal_buf;
  HEAP32[$2>>2] = 80;
  $10 = (($internal_buf) + 80|0);
  $11 = (($f) + 16|0);
  HEAP32[$11>>2] = $10;
  $12 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
  $13 = ($7|0)==(0|0);
  if ($13) {
   $ret$1 = $12;
  } else {
   $14 = (($f) + 36|0);
   $15 = HEAP32[$14>>2]|0;
   (FUNCTION_TABLE_iiii[$15 & 1]($f,0,0)|0);
   $16 = HEAP32[$9>>2]|0;
   $17 = ($16|0)==(0|0);
   $$ = $17 ? -1 : $12;
   HEAP32[$6>>2] = $7;
   HEAP32[$2>>2] = 0;
   HEAP32[$11>>2] = 0;
   HEAP32[$8>>2] = 0;
   HEAP32[$9>>2] = 0;
   $ret$1 = $$;
  }
 } else {
  $5 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
  $ret$1 = $5;
 }
 $$0 = $ret$1;
 STACKTOP = sp;return ($$0|0);
}
function _vsnprintf($s,$n,$fmt,$ap) {
 $s = $s|0;
 $n = $n|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $$$02 = 0, $$0 = 0, $$01 = 0, $$02 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $b = 0, $f = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $b = sp + 112|0;
 $f = sp;
 dest=$f+0|0; src=2616+0|0; stop=dest+112|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 $0 = (($n) + -1)|0;
 $1 = ($0>>>0)>(2147483646);
 if ($1) {
  $2 = ($n|0)==(0);
  if ($2) {
   $$01 = $b;$$02 = 1;
  } else {
   $3 = (___errno_location()|0);
   HEAP32[$3>>2] = 75;
   $$0 = -1;
   STACKTOP = sp;return ($$0|0);
  }
 } else {
  $$01 = $s;$$02 = $n;
 }
 $4 = $$01;
 $5 = (-2 - ($4))|0;
 $6 = ($$02>>>0)>($5>>>0);
 $$$02 = $6 ? $5 : $$02;
 $7 = (($f) + 48|0);
 HEAP32[$7>>2] = $$$02;
 $8 = (($f) + 20|0);
 HEAP32[$8>>2] = $$01;
 $9 = (($f) + 44|0);
 HEAP32[$9>>2] = $$01;
 $10 = (($$01) + ($$$02)|0);
 $11 = (($f) + 16|0);
 HEAP32[$11>>2] = $10;
 $12 = (($f) + 28|0);
 HEAP32[$12>>2] = $10;
 $13 = (_MUSL_vfprintf($f,$fmt,$ap)|0);
 $14 = ($$$02|0)==(0);
 if ($14) {
  $$0 = $13;
  STACKTOP = sp;return ($$0|0);
 }
 $15 = HEAP32[$8>>2]|0;
 $16 = HEAP32[$11>>2]|0;
 $17 = ($15|0)==($16|0);
 $18 = $17 << 31 >> 31;
 $19 = (($15) + ($18)|0);
 HEAP8[$19>>0] = 0;
 $$0 = $13;
 STACKTOP = sp;return ($$0|0);
}
function _vsprintf($s,$fmt,$ap) {
 $s = $s|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_vsnprintf($s,2147483647,$fmt,$ap)|0);
 STACKTOP = sp;return ($0|0);
}
function _memchr($src,$c,$n) {
 $src = $src|0;
 $c = $c|0;
 $n = $n|0;
 var $$0$lcssa = 0, $$0$lcssa44 = 0, $$019 = 0, $$1$lcssa = 0, $$110 = 0, $$24 = 0, $$3 = 0, $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0;
 var $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond18 = 0, $s$0$lcssa = 0, $s$0$lcssa43 = 0, $s$020 = 0, $s$15 = 0, $s$2 = 0, $w$0$lcssa = 0, $w$011 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $c & 255;
 $1 = $src;
 $2 = $1 & 3;
 $3 = ($2|0)!=(0);
 $4 = ($n|0)!=(0);
 $or$cond18 = $3 & $4;
 L1: do {
  if ($or$cond18) {
   $5 = $c&255;
   $$019 = $n;$s$020 = $src;
   while(1) {
    $6 = HEAP8[$s$020>>0]|0;
    $7 = ($6<<24>>24)==($5<<24>>24);
    if ($7) {
     $$0$lcssa44 = $$019;$s$0$lcssa43 = $s$020;
     label = 6;
     break L1;
    }
    $8 = (($s$020) + 1|0);
    $9 = (($$019) + -1)|0;
    $10 = $8;
    $11 = $10 & 3;
    $12 = ($11|0)!=(0);
    $13 = ($9|0)!=(0);
    $or$cond = $12 & $13;
    if ($or$cond) {
     $$019 = $9;$s$020 = $8;
    } else {
     $$0$lcssa = $9;$$lcssa = $13;$s$0$lcssa = $8;
     label = 5;
     break;
    }
   }
  } else {
   $$0$lcssa = $n;$$lcssa = $4;$s$0$lcssa = $src;
   label = 5;
  }
 } while(0);
 if ((label|0) == 5) {
  if ($$lcssa) {
   $$0$lcssa44 = $$0$lcssa;$s$0$lcssa43 = $s$0$lcssa;
   label = 6;
  } else {
   $$3 = 0;$s$2 = $s$0$lcssa;
  }
 }
 L8: do {
  if ((label|0) == 6) {
   $14 = HEAP8[$s$0$lcssa43>>0]|0;
   $15 = $c&255;
   $16 = ($14<<24>>24)==($15<<24>>24);
   if ($16) {
    $$3 = $$0$lcssa44;$s$2 = $s$0$lcssa43;
   } else {
    $17 = Math_imul($0, 16843009)|0;
    $18 = ($$0$lcssa44>>>0)>(3);
    L11: do {
     if ($18) {
      $$110 = $$0$lcssa44;$w$011 = $s$0$lcssa43;
      while(1) {
       $19 = HEAP32[$w$011>>2]|0;
       $20 = $19 ^ $17;
       $21 = (($20) + -16843009)|0;
       $22 = $20 & -2139062144;
       $23 = $22 ^ -2139062144;
       $24 = $23 & $21;
       $25 = ($24|0)==(0);
       if (!($25)) {
        $$1$lcssa = $$110;$w$0$lcssa = $w$011;
        break L11;
       }
       $26 = (($w$011) + 4|0);
       $27 = (($$110) + -4)|0;
       $28 = ($27>>>0)>(3);
       if ($28) {
        $$110 = $27;$w$011 = $26;
       } else {
        $$1$lcssa = $27;$w$0$lcssa = $26;
        break;
       }
      }
     } else {
      $$1$lcssa = $$0$lcssa44;$w$0$lcssa = $s$0$lcssa43;
     }
    } while(0);
    $29 = ($$1$lcssa|0)==(0);
    if ($29) {
     $$3 = 0;$s$2 = $w$0$lcssa;
    } else {
     $$24 = $$1$lcssa;$s$15 = $w$0$lcssa;
     while(1) {
      $30 = HEAP8[$s$15>>0]|0;
      $31 = ($30<<24>>24)==($15<<24>>24);
      if ($31) {
       $$3 = $$24;$s$2 = $s$15;
       break L8;
      }
      $32 = (($s$15) + 1|0);
      $33 = (($$24) + -1)|0;
      $34 = ($33|0)==(0);
      if ($34) {
       $$3 = 0;$s$2 = $32;
       break;
      } else {
       $$24 = $33;$s$15 = $32;
      }
     }
    }
   }
  }
 } while(0);
 $35 = ($$3|0)!=(0);
 $36 = $35 ? $s$2 : 0;
 STACKTOP = sp;return ($36|0);
}
function _printf_core($f,$fmt,$ap,$nl_arg,$nl_type) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 $nl_arg = $nl_arg|0;
 $nl_type = $nl_type|0;
 var $$ = 0, $$$5$i = 0, $$$i = 0, $$$p$i = 0, $$0 = 0, $$0$lcssa$i = 0, $$0$lcssa$i$i = 0, $$0$lcssa$i105$i = 0, $$0$lcssa$i112$i = 0, $$0$lcssa$i136$i = 0, $$0$lcssa$i151$i = 0, $$0$lcssa$i47 = 0, $$0$lcssa$i47$i = 0, $$0$lcssa$i52 = 0, $$0$lcssa$i54 = 0, $$0$lcssa$i54$i = 0, $$0$lcssa$i56$i = 0, $$0$lcssa$i62 = 0, $$0$lcssa$i64$i = 0, $$0$lcssa$i69 = 0;
 var $$0$lcssa$i71$i = 0, $$0$lcssa$i76 = 0, $$0$lcssa$i77$i = 0, $$0$lcssa$i84$i = 0, $$0$lcssa$i86 = 0, $$0$lcssa$i92$i = 0, $$01$i = 0, $$01$i$i = 0, $$01$i103$i = 0, $$01$i110$i = 0, $$01$i134$i = 0, $$01$i149$i = 0, $$01$i45 = 0, $$01$i45$i = 0, $$01$i52$i = 0, $$01$i60 = 0, $$01$i62$i = 0, $$01$i67 = 0, $$01$i69$i = 0, $$01$i74 = 0;
 var $$01$i75$i = 0, $$01$i82$i = 0, $$01$i84 = 0, $$01$lcssa$off0$i = 0, $$01$lcssa$off0$i$i = 0, $$01$lcssa$off0$i93$i = 0, $$012$i = 0, $$013$i = 0.0, $$019$i = 0, $$03$i49 = 0, $$05$i = 0, $$05$i$i = 0, $$05$i87$i = 0, $$1$i = 0.0, $$1$lcssa$i$i = 0, $$1$lcssa$i120$i = 0, $$100 = 0, $$12$i = 0, $$12$i$i = 0, $$12$i118$i = 0;
 var $$12$i127$i = 0, $$12$i142$i = 0, $$12$i142$i$lcssa = 0, $$12$i95$i = 0, $$120$i = 0, $$2$i = 0.0, $$2$us$i = 0.0, $$2$us$us$i = 0.0, $$21 = 0, $$216$$29$i = 0, $$216$$31$i = 0, $$216$i = 0, $$25 = 0, $$26 = 0, $$26$i = 0, $$26$us$i = 0, $$27$i = 0, $$28$i = 0.0, $$29$i = 0, $$3$i = 0.0;
 var $$31$i = 0, $$317$i = 0, $$39$i = 0, $$4$i = 0.0, $$418$lcssa$i = 0, $$418193$i = 0, $$5205$i = 0, $$a$3$i = 0, $$a$3$us$i = 0, $$a$3$us309$i = 0, $$a$3$us310$i = 0, $$a$3311$i = 0, $$a$3312$i = 0, $$fl$4 = 0, $$l10n$0 = 0, $$lcssa = 0, $$lcssa283$i = 0, $$lcssa291 = 0, $$lcssa297 = 0, $$lcssa298 = 0;
 var $$lcssa299 = 0, $$lcssa300 = 0, $$lcssa301 = 0, $$lcssa302 = 0, $$lcssa304 = 0, $$lcssa305 = 0, $$lcssa311 = 0, $$lcssa315 = 0, $$lcssa317 = 0, $$lcssa320 = 0, $$lcssa321 = 0, $$lcssa324 = 0.0, $$lcssa325 = 0, $$lcssa328 = 0, $$lcssa332 = 0, $$mask$i = 0, $$mask$i39 = 0, $$mask1$i = 0, $$mask1$i38 = 0, $$neg159$i = 0;
 var $$neg160$i = 0, $$not$i = 0, $$p$5 = 0, $$p$i = 0, $$pn$i = 0, $$pr$i = 0, $$pr154$i = 0, $$pre = 0, $$pre$i = 0, $$pre269 = 0, $$pre270 = 0, $$pre308$i = 0, $$sum$i = 0, $$sum21$i = 0, $$sum22$i = 0, $$z$3$i = 0, $$z$4$us$i = 0, $0 = 0, $1 = 0, $10 = 0;
 var $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0;
 var $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0.0, $1031 = 0.0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0;
 var $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $1039$phi = 0, $104 = 0, $1040 = 0, $1040$phi = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0;
 var $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0;
 var $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $124$phi = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0.0, $176 = 0, $177 = 0, $178 = 0.0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0.0, $356 = 0, $357 = 0.0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0;
 var $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0.0, $396 = 0.0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0;
 var $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0.0, $411 = 0, $412 = 0, $413 = 0, $414 = 0.0, $415 = 0.0, $416 = 0.0, $417 = 0.0, $418 = 0.0, $419 = 0.0, $42 = 0, $420 = 0, $421 = 0;
 var $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0;
 var $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0;
 var $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0.0, $468 = 0.0, $469 = 0.0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0;
 var $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0.0, $483 = 0.0, $484 = 0.0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0;
 var $495 = 0, $496 = 0, $497 = 0.0, $498 = 0.0, $499 = 0.0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0;
 var $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0;
 var $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0;
 var $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0.0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0.0, $562 = 0.0, $563 = 0.0, $564 = 0, $565 = 0, $566 = 0;
 var $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $579$phi = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0;
 var $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0;
 var $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0;
 var $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0;
 var $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0;
 var $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0;
 var $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0;
 var $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0.0, $701 = 0.0, $702 = 0, $703 = 0.0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0;
 var $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0;
 var $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0;
 var $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0;
 var $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0;
 var $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0;
 var $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0;
 var $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0;
 var $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0;
 var $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0;
 var $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $879$phi = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0;
 var $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0;
 var $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0;
 var $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0;
 var $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0;
 var $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0;
 var $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0;
 var $998 = 0, $999 = 0, $a$0 = 0, $a$1 = 0, $a$1$lcssa$i = 0, $a$1261$i = 0, $a$2 = 0, $a$2$ph$i = 0, $a$3$lcssa$i = 0, $a$3248$i = 0, $a$3248$us$i = 0, $a$5$lcssa$i = 0, $a$5223$i = 0, $a$6$i = 0, $a$7$i = 0, $a$8$ph$i = 0, $a$8$ph294$i = 0, $arglist_current = 0, $arglist_current11 = 0, $arglist_current14 = 0;
 var $arglist_current17 = 0, $arglist_current2 = 0, $arglist_current20 = 0, $arglist_current23 = 0, $arglist_current26 = 0, $arglist_current29 = 0, $arglist_current32 = 0, $arglist_current35 = 0, $arglist_current38 = 0, $arglist_current41 = 0, $arglist_current44 = 0, $arglist_current47 = 0, $arglist_current5 = 0, $arglist_current50 = 0, $arglist_current53 = 0, $arglist_current56 = 0, $arglist_current59 = 0, $arglist_current62 = 0, $arglist_current8 = 0, $arglist_next = 0;
 var $arglist_next12 = 0, $arglist_next15 = 0, $arglist_next18 = 0, $arglist_next21 = 0, $arglist_next24 = 0, $arglist_next27 = 0, $arglist_next3 = 0, $arglist_next30 = 0, $arglist_next33 = 0, $arglist_next36 = 0, $arglist_next39 = 0, $arglist_next42 = 0, $arglist_next45 = 0, $arglist_next48 = 0, $arglist_next51 = 0, $arglist_next54 = 0, $arglist_next57 = 0, $arglist_next6 = 0, $arglist_next60 = 0, $arglist_next63 = 0;
 var $arglist_next9 = 0, $argpos$0 = 0, $big$i = 0, $buf = 0, $buf$i = 0, $carry$0254$i = 0, $carry3$0242$i = 0, $carry3$0242$us$i = 0, $cnt$0 = 0, $cnt$1 = 0, $cnt$1$lcssa = 0, $d$0$i = 0, $d$0253$i = 0, $d$0255$i = 0, $d$1241$i = 0, $d$1241$us$i = 0, $d$2$lcssa$i = 0, $d$2222$i = 0, $d$3$i = 0, $d$4199$i = 0;
 var $d$5192$i = 0, $d$6204$i = 0, $e$0237$i = 0, $e$1$i = 0, $e$2218$i = 0, $e$3$i = 0, $e$4$ph$i = 0, $e2$i = 0, $ebuf0$i = 0, $estr$0$i = 0, $estr$1$lcssa$i = 0, $estr$1$ph$i = 0, $estr$1209$i = 0, $estr$2$i = 0, $exitcond$i = 0, $fl$0115 = 0, $fl$0175 = 0, $fl$1 = 0, $fl$1$ = 0, $fl$3 = 0;
 var $fl$4 = 0, $fl$6 = 0, $fmt88$lcssa = 0, $fmt88167 = 0, $fmt89 = 0, $fmt90 = 0, $fmt91 = 0, $fmt93 = 0, $fmt93$lcssa294 = 0, $fmt94 = 0, $i$0$lcssa = 0, $i$0$lcssa275 = 0, $i$0180 = 0, $i$0236$i = 0, $i$03$i = 0, $i$03$i31 = 0, $i$1$lcssa$i = 0, $i$1191 = 0, $i$1230$i = 0, $i$2166 = 0;
 var $i$2217$i = 0, $i$3164 = 0, $i$3213$i = 0, $isdigit = 0, $isdigit$i = 0, $isdigit$i33 = 0, $isdigit10 = 0, $isdigit12 = 0, $isdigit2$i = 0, $isdigit2$i29 = 0, $isdigittmp = 0, $isdigittmp$ = 0, $isdigittmp$i = 0, $isdigittmp$i32 = 0, $isdigittmp1$i = 0, $isdigittmp1$i28 = 0, $isdigittmp11 = 0, $isdigittmp4$i = 0, $isdigittmp4$i30 = 0, $isdigittmp9 = 0;
 var $j$0$i = 0, $j$0229$i = 0, $j$0231$i = 0, $j$1214$i = 0, $j$2$i = 0, $l$0 = 0, $l$0$i = 0, $l$1$i = 0, $l$1179 = 0, $l$2 = 0, $l10n$0 = 0, $l10n$0$lcssa = 0, $l10n$0$phi = 0, $l10n$1 = 0, $l10n$2 = 0, $l10n$3 = 0, $mb = 0, $notlhs$us$us$i = 0, $notrhs$i = 0, $or$cond = 0;
 var $or$cond$i = 0, $or$cond$i$i = 0, $or$cond$i101$i = 0, $or$cond$i108$i = 0, $or$cond$i43$i = 0, $or$cond$i50$i = 0, $or$cond$i58 = 0, $or$cond$i60$i = 0, $or$cond$i65 = 0, $or$cond$i67$i = 0, $or$cond$i72 = 0, $or$cond$i80 = 0, $or$cond$i80$i = 0, $or$cond$i82 = 0, $or$cond10$i = 0, $or$cond10191$i = 0, $or$cond12$i = 0, $or$cond15 = 0, $or$cond19 = 0, $or$cond23 = 0;
 var $or$cond279 = 0, $or$cond35$i = 0, $or$cond37$i = 0, $or$cond6$i = 0, $p$0 = 0, $p$1 = 0, $p$2 = 0, $p$2$ = 0, $p$4274 = 0, $p$5 = 0, $pad$i = 0, $pl$0 = 0, $pl$0$i = 0, $pl$1 = 0, $pl$1$i = 0, $pl$2 = 0, $prefix$0 = 0, $prefix$0$$i = 0, $prefix$0$i = 0, $prefix$1 = 0;
 var $prefix$2 = 0, $r$0$a$8$i = 0, $re$0$i = 0, $re$1187$i = 0, $round$0186$i = 0.0, $round6$1$i = 0.0, $s$0$i = 0, $s$0$us$i = 0, $s$0$us$us$i = 0, $s$1$i = 0, $s$1$lcssa$i = 0, $s$1$us$i = 0, $s$1$us$us$i = 0, $s1$0$i = 0, $s7$0196$i = 0, $s7$1$i = 0, $s8$0$lcssa$i = 0, $s8$0188$i = 0, $s9$0$i = 0, $s9$1200$i = 0;
 var $s9$2$i = 0, $sext = 0, $sext101 = 0, $small$0$i = 0.0, $small$1$i = 0.0, $st$0 = 0, $st$0$lcssa295 = 0, $storemerge = 0, $storemerge13 = 0, $storemerge8113 = 0, $storemerge8174 = 0, $t$0 = 0, $t$1 = 0, $uglygep$i = 0, $uglygep296$i = 0, $uglygep300$i = 0, $uglygep300301$i = 0, $umax$i = 0, $umax297$i = 0, $umax297298299$i = 0;
 var $w$$i = 0, $w$0 = 0, $w$1 = 0, $w$2 = 0, $w$25$i = 0, $w$38$i = 0, $wc = 0, $ws$0181 = 0, $ws$1192 = 0, $y$03$i = 0, $y$03$i$i = 0, $y$03$i117$i = 0, $y$03$i126$i = 0, $y$03$i141$i = 0, $y$03$i94$i = 0, $z$0$i = 0, $z$0$lcssa = 0, $z$0168 = 0, $z$1$lcssa$i = 0, $z$1260$i = 0;
 var $z$2 = 0, $z$2$i = 0, $z$2$i$lcssa = 0, $z$3$lcssa$i = 0, $z$3247$i = 0, $z$3247$us$i = 0, $z$4$i = 0, $z$4$us$i = 0, $z$5$i = 0, $z$6$$i = 0, $z$6$i = 0, $z$6$i$lcssa = 0, $z$6$ph$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 864|0;
 $big$i = sp + 16|0;
 $e2$i = sp + 8|0;
 $buf$i = sp + 560|0;
 $0 = $buf$i;
 $ebuf0$i = sp + 840|0;
 $pad$i = sp + 584|0;
 $buf = sp + 520|0;
 $wc = sp;
 $mb = sp + 852|0;
 $1 = ($f|0)!=(0|0);
 $2 = (($buf) + 40|0);
 $3 = $2;
 $4 = (($buf) + 39|0);
 $5 = (($wc) + 4|0);
 $6 = $wc;
 $7 = (($ebuf0$i) + 12|0);
 $8 = (($ebuf0$i) + 11|0);
 $9 = $7;
 $10 = (($9) - ($0))|0;
 $11 = (-2 - ($0))|0;
 $12 = (($9) + 2)|0;
 $13 = (($big$i) + 288|0);
 $14 = (($buf$i) + 9|0);
 $15 = $14;
 $16 = (($buf$i) + 8|0);
 $1039 = 0;$1040 = 0;$cnt$0 = 0;$fmt90 = $fmt;$l$0 = 0;$l10n$0 = 0;
 L1: while(1) {
  $17 = ($cnt$0|0)>(-1);
  do {
   if ($17) {
    $18 = (2147483647 - ($cnt$0))|0;
    $19 = ($l$0|0)>($18|0);
    if ($19) {
     $20 = (___errno_location()|0);
     HEAP32[$20>>2] = 75;
     $cnt$1 = -1;
     break;
    } else {
     $21 = (($l$0) + ($cnt$0))|0;
     $cnt$1 = $21;
     break;
    }
   } else {
    $cnt$1 = $cnt$0;
   }
  } while(0);
  $22 = HEAP8[$fmt90>>0]|0;
  $23 = ($22<<24>>24)==(0);
  if ($23) {
   $cnt$1$lcssa = $cnt$1;$l10n$0$lcssa = $l10n$0;
   label = 351;
   break;
  } else {
   $1041 = $22;$fmt89 = $fmt90;
  }
  while(1) {
   if ((($1041<<24>>24) == 37)) {
    $fmt88167 = $fmt89;$z$0168 = $fmt89;
    label = 9;
    break;
   } else if ((($1041<<24>>24) == 0)) {
    $fmt88$lcssa = $fmt89;$z$0$lcssa = $fmt89;
    break;
   }
   $24 = (($fmt89) + 1|0);
   $$pre = HEAP8[$24>>0]|0;
   $1041 = $$pre;$fmt89 = $24;
  }
  L12: do {
   if ((label|0) == 9) {
    while(1) {
     label = 0;
     $25 = (($fmt88167) + 1|0);
     $26 = HEAP8[$25>>0]|0;
     $27 = ($26<<24>>24)==(37);
     if (!($27)) {
      $fmt88$lcssa = $fmt88167;$z$0$lcssa = $z$0168;
      break L12;
     }
     $28 = (($z$0168) + 1|0);
     $29 = (($fmt88167) + 2|0);
     $30 = HEAP8[$29>>0]|0;
     $31 = ($30<<24>>24)==(37);
     if ($31) {
      $fmt88167 = $29;$z$0168 = $28;
      label = 9;
     } else {
      $fmt88$lcssa = $29;$z$0$lcssa = $28;
      break;
     }
    }
   }
  } while(0);
  $32 = $z$0$lcssa;
  $33 = $fmt90;
  $34 = (($32) - ($33))|0;
  if ($1) {
   (___fwritex($fmt90,$34,$f)|0);
  }
  $35 = ($z$0$lcssa|0)==($fmt90|0);
  if (!($35)) {
   $l10n$0$phi = $l10n$0;$1040$phi = $1040;$1039$phi = $1039;$cnt$0 = $cnt$1;$fmt90 = $fmt88$lcssa;$l$0 = $34;$l10n$0 = $l10n$0$phi;$1040 = $1040$phi;$1039 = $1039$phi;
   continue;
  }
  $36 = (($fmt88$lcssa) + 1|0);
  $37 = HEAP8[$36>>0]|0;
  $38 = $37 << 24 >> 24;
  $isdigittmp = (($38) + -48)|0;
  $isdigit = ($isdigittmp>>>0)<(10);
  if ($isdigit) {
   $39 = (($fmt88$lcssa) + 2|0);
   $40 = HEAP8[$39>>0]|0;
   $41 = ($40<<24>>24)==(36);
   $42 = (($fmt88$lcssa) + 3|0);
   $$100 = $41 ? $42 : $36;
   $$l10n$0 = $41 ? 1 : $l10n$0;
   $isdigittmp$ = $41 ? $isdigittmp : -1;
   $$pre269 = HEAP8[$$100>>0]|0;
   $44 = $$pre269;$argpos$0 = $isdigittmp$;$l10n$1 = $$l10n$0;$storemerge = $$100;
  } else {
   $44 = $37;$argpos$0 = -1;$l10n$1 = $l10n$0;$storemerge = $36;
  }
  $43 = $44 << 24 >> 24;
  $45 = $43 & -32;
  $46 = ($45|0)==(32);
  L24: do {
   if ($46) {
    $48 = $43;$53 = $44;$fl$0175 = 0;$storemerge8174 = $storemerge;
    while(1) {
     $47 = (($48) + -32)|0;
     $49 = 1 << $47;
     $50 = $49 & 75913;
     $51 = ($50|0)==(0);
     if ($51) {
      $63 = $53;$fl$0115 = $fl$0175;$storemerge8113 = $storemerge8174;
      break L24;
     }
     $52 = $53 << 24 >> 24;
     $54 = (($52) + -32)|0;
     $55 = 1 << $54;
     $56 = $55 | $fl$0175;
     $57 = (($storemerge8174) + 1|0);
     $58 = HEAP8[$57>>0]|0;
     $59 = $58 << 24 >> 24;
     $60 = $59 & -32;
     $61 = ($60|0)==(32);
     if ($61) {
      $48 = $59;$53 = $58;$fl$0175 = $56;$storemerge8174 = $57;
     } else {
      $63 = $58;$fl$0115 = $56;$storemerge8113 = $57;
      break;
     }
    }
   } else {
    $63 = $44;$fl$0115 = 0;$storemerge8113 = $storemerge;
   }
  } while(0);
  $62 = ($63<<24>>24)==(42);
  do {
   if ($62) {
    $64 = (($storemerge8113) + 1|0);
    $65 = HEAP8[$64>>0]|0;
    $66 = $65 << 24 >> 24;
    $isdigittmp11 = (($66) + -48)|0;
    $isdigit12 = ($isdigittmp11>>>0)<(10);
    if ($isdigit12) {
     $67 = (($storemerge8113) + 2|0);
     $68 = HEAP8[$67>>0]|0;
     $69 = ($68<<24>>24)==(36);
     if ($69) {
      $70 = (($nl_type) + ($isdigittmp11<<2)|0);
      HEAP32[$70>>2] = 10;
      $71 = HEAP8[$64>>0]|0;
      $72 = $71 << 24 >> 24;
      $73 = (($72) + -48)|0;
      $74 = (($nl_arg) + ($73<<3)|0);
      $75 = $74;
      $76 = $75;
      $77 = HEAP32[$76>>2]|0;
      $78 = (($75) + 4)|0;
      $79 = $78;
      $80 = HEAP32[$79>>2]|0;
      $81 = (($storemerge8113) + 3|0);
      $l10n$2 = 1;$storemerge13 = $81;$w$0 = $77;
     } else {
      label = 23;
     }
    } else {
     label = 23;
    }
    if ((label|0) == 23) {
     label = 0;
     $82 = ($l10n$1|0)==(0);
     if (!($82)) {
      $$0 = -1;
      label = 369;
      break L1;
     }
     if (!($1)) {
      $fl$1 = $fl$0115;$fmt91 = $64;$l10n$3 = 0;$w$1 = 0;
      break;
     }
     $arglist_current = HEAP32[$ap>>2]|0;
     $83 = HEAP32[$arglist_current>>2]|0;
     $arglist_next = (($arglist_current) + 4|0);
     HEAP32[$ap>>2] = $arglist_next;
     $l10n$2 = 0;$storemerge13 = $64;$w$0 = $83;
    }
    $84 = ($w$0|0)<(0);
    if ($84) {
     $85 = $fl$0115 | 8192;
     $86 = (0 - ($w$0))|0;
     $fl$1 = $85;$fmt91 = $storemerge13;$l10n$3 = $l10n$2;$w$1 = $86;
    } else {
     $fl$1 = $fl$0115;$fmt91 = $storemerge13;$l10n$3 = $l10n$2;$w$1 = $w$0;
    }
   } else {
    $87 = $63 << 24 >> 24;
    $isdigittmp1$i = (($87) + -48)|0;
    $isdigit2$i = ($isdigittmp1$i>>>0)<(10);
    if ($isdigit2$i) {
     $91 = $storemerge8113;$i$03$i = 0;$isdigittmp4$i = $isdigittmp1$i;
     while(1) {
      $88 = ($i$03$i*10)|0;
      $89 = (($88) + ($isdigittmp4$i))|0;
      $90 = (($91) + 1|0);
      $92 = HEAP8[$90>>0]|0;
      $93 = $92 << 24 >> 24;
      $isdigittmp$i = (($93) + -48)|0;
      $isdigit$i = ($isdigittmp$i>>>0)<(10);
      if ($isdigit$i) {
       $91 = $90;$i$03$i = $89;$isdigittmp4$i = $isdigittmp$i;
      } else {
       $$lcssa = $89;$$lcssa291 = $90;
       break;
      }
     }
     $94 = ($$lcssa|0)<(0);
     if ($94) {
      $$0 = -1;
      label = 369;
      break L1;
     } else {
      $fl$1 = $fl$0115;$fmt91 = $$lcssa291;$l10n$3 = $l10n$1;$w$1 = $$lcssa;
     }
    } else {
     $fl$1 = $fl$0115;$fmt91 = $storemerge8113;$l10n$3 = $l10n$1;$w$1 = 0;
    }
   }
  } while(0);
  $95 = HEAP8[$fmt91>>0]|0;
  $96 = ($95<<24>>24)==(46);
  L45: do {
   if ($96) {
    $97 = (($fmt91) + 1|0);
    $98 = HEAP8[$97>>0]|0;
    $99 = ($98<<24>>24)==(42);
    if (!($99)) {
     $120 = $98 << 24 >> 24;
     $isdigittmp1$i28 = (($120) + -48)|0;
     $isdigit2$i29 = ($isdigittmp1$i28>>>0)<(10);
     if ($isdigit2$i29) {
      $1042 = $97;$124 = $fmt91;$i$03$i31 = 0;$isdigittmp4$i30 = $isdigittmp1$i28;
     } else {
      $fmt94 = $97;$p$0 = 0;
      break;
     }
     while(1) {
      $121 = ($i$03$i31*10)|0;
      $122 = (($121) + ($isdigittmp4$i30))|0;
      $123 = (($124) + 2|0);
      $125 = HEAP8[$123>>0]|0;
      $126 = $125 << 24 >> 24;
      $isdigittmp$i32 = (($126) + -48)|0;
      $isdigit$i33 = ($isdigittmp$i32>>>0)<(10);
      if ($isdigit$i33) {
       $124$phi = $1042;$1042 = $123;$i$03$i31 = $122;$isdigittmp4$i30 = $isdigittmp$i32;$124 = $124$phi;
      } else {
       $fmt94 = $123;$p$0 = $122;
       break L45;
      }
     }
    }
    $100 = (($fmt91) + 2|0);
    $101 = HEAP8[$100>>0]|0;
    $102 = $101 << 24 >> 24;
    $isdigittmp9 = (($102) + -48)|0;
    $isdigit10 = ($isdigittmp9>>>0)<(10);
    if ($isdigit10) {
     $103 = (($fmt91) + 3|0);
     $104 = HEAP8[$103>>0]|0;
     $105 = ($104<<24>>24)==(36);
     if ($105) {
      $106 = (($nl_type) + ($isdigittmp9<<2)|0);
      HEAP32[$106>>2] = 10;
      $107 = HEAP8[$100>>0]|0;
      $108 = $107 << 24 >> 24;
      $109 = (($108) + -48)|0;
      $110 = (($nl_arg) + ($109<<3)|0);
      $111 = $110;
      $112 = $111;
      $113 = HEAP32[$112>>2]|0;
      $114 = (($111) + 4)|0;
      $115 = $114;
      $116 = HEAP32[$115>>2]|0;
      $117 = (($fmt91) + 4|0);
      $fmt94 = $117;$p$0 = $113;
      break;
     }
    }
    $118 = ($l10n$3|0)==(0);
    if (!($118)) {
     $$0 = -1;
     label = 369;
     break L1;
    }
    if ($1) {
     $arglist_current2 = HEAP32[$ap>>2]|0;
     $119 = HEAP32[$arglist_current2>>2]|0;
     $arglist_next3 = (($arglist_current2) + 4|0);
     HEAP32[$ap>>2] = $arglist_next3;
     $fmt94 = $100;$p$0 = $119;
    } else {
     $fmt94 = $100;$p$0 = 0;
    }
   } else {
    $fmt94 = $fmt91;$p$0 = -1;
   }
  } while(0);
  $fmt93 = $fmt94;$st$0 = 0;
  while(1) {
   $127 = HEAP8[$fmt93>>0]|0;
   $128 = $127 << 24 >> 24;
   $129 = (($128) + -65)|0;
   $130 = ($129>>>0)>(57);
   if ($130) {
    $$0 = -1;
    label = 369;
    break L1;
   }
   $131 = (($fmt93) + 1|0);
   $132 = ((2048 + (($st$0*58)|0)|0) + ($129)|0);
   $133 = HEAP8[$132>>0]|0;
   $134 = $133&255;
   $135 = (($134) + -1)|0;
   $136 = ($135>>>0)<(8);
   if ($136) {
    $fmt93 = $131;$st$0 = $134;
   } else {
    $$lcssa297 = $127;$$lcssa298 = $131;$$lcssa299 = $133;$$lcssa300 = $134;$fmt93$lcssa294 = $fmt93;$st$0$lcssa295 = $st$0;
    break;
   }
  }
  $137 = ($$lcssa299<<24>>24)==(0);
  if ($137) {
   $$0 = -1;
   label = 369;
   break;
  }
  $138 = ($$lcssa299<<24>>24)==(19);
  $139 = ($argpos$0|0)>(-1);
  L64: do {
   if ($138) {
    if ($139) {
     $$0 = -1;
     label = 369;
     break L1;
    } else {
     $1043 = $1039;$1044 = $1040;
     label = 62;
    }
   } else {
    if ($139) {
     $140 = (($nl_type) + ($argpos$0<<2)|0);
     HEAP32[$140>>2] = $$lcssa300;
     $141 = (($nl_arg) + ($argpos$0<<3)|0);
     $142 = $141;
     $143 = $142;
     $144 = HEAP32[$143>>2]|0;
     $145 = (($142) + 4)|0;
     $146 = $145;
     $147 = HEAP32[$146>>2]|0;
     $1043 = $144;$1044 = $147;
     label = 62;
     break;
    }
    if (!($1)) {
     $$0 = 0;
     label = 369;
     break L1;
    }
    $148 = ($$lcssa299&255)>(20);
    if ($148) {
     $182 = $$lcssa297;$191 = $1039;$218 = $1040;
    } else {
     do {
      switch ($$lcssa300|0) {
      case 9:  {
       $arglist_current5 = HEAP32[$ap>>2]|0;
       $149 = HEAP32[$arglist_current5>>2]|0;
       $arglist_next6 = (($arglist_current5) + 4|0);
       HEAP32[$ap>>2] = $arglist_next6;
       $150 = $149;
       $1045 = $1040;$1046 = $150;
       label = 63;
       break L64;
       break;
      }
      case 10:  {
       $arglist_current8 = HEAP32[$ap>>2]|0;
       $151 = HEAP32[$arglist_current8>>2]|0;
       $arglist_next9 = (($arglist_current8) + 4|0);
       HEAP32[$ap>>2] = $arglist_next9;
       $152 = ($151|0)<(0);
       $153 = $152 << 31 >> 31;
       $1045 = $153;$1046 = $151;
       label = 63;
       break L64;
       break;
      }
      case 11:  {
       $arglist_current11 = HEAP32[$ap>>2]|0;
       $154 = HEAP32[$arglist_current11>>2]|0;
       $arglist_next12 = (($arglist_current11) + 4|0);
       HEAP32[$ap>>2] = $arglist_next12;
       $1045 = 0;$1046 = $154;
       label = 63;
       break L64;
       break;
      }
      case 12:  {
       $arglist_current14 = HEAP32[$ap>>2]|0;
       $155 = $arglist_current14;
       $156 = $155;
       $157 = HEAP32[$156>>2]|0;
       $158 = (($155) + 4)|0;
       $159 = $158;
       $160 = HEAP32[$159>>2]|0;
       $arglist_next15 = (($arglist_current14) + 8|0);
       HEAP32[$ap>>2] = $arglist_next15;
       $1045 = $160;$1046 = $157;
       label = 63;
       break L64;
       break;
      }
      case 13:  {
       $arglist_current17 = HEAP32[$ap>>2]|0;
       $161 = HEAP32[$arglist_current17>>2]|0;
       $arglist_next18 = (($arglist_current17) + 4|0);
       HEAP32[$ap>>2] = $arglist_next18;
       $162 = $161&65535;
       $163 = $162 << 16 >> 16;
       $164 = ($163|0)<(0);
       $165 = $164 << 31 >> 31;
       $sext101 = $161 << 16;
       $166 = $sext101 >> 16;
       $1045 = $165;$1046 = $166;
       label = 63;
       break L64;
       break;
      }
      case 14:  {
       $arglist_current20 = HEAP32[$ap>>2]|0;
       $167 = HEAP32[$arglist_current20>>2]|0;
       $arglist_next21 = (($arglist_current20) + 4|0);
       HEAP32[$ap>>2] = $arglist_next21;
       $$mask1$i38 = $167 & 65535;
       $1045 = 0;$1046 = $$mask1$i38;
       label = 63;
       break L64;
       break;
      }
      case 15:  {
       $arglist_current23 = HEAP32[$ap>>2]|0;
       $168 = HEAP32[$arglist_current23>>2]|0;
       $arglist_next24 = (($arglist_current23) + 4|0);
       HEAP32[$ap>>2] = $arglist_next24;
       $169 = $168&255;
       $170 = $169 << 24 >> 24;
       $171 = ($170|0)<(0);
       $172 = $171 << 31 >> 31;
       $sext = $168 << 24;
       $173 = $sext >> 24;
       $1045 = $172;$1046 = $173;
       label = 63;
       break L64;
       break;
      }
      case 16:  {
       $arglist_current26 = HEAP32[$ap>>2]|0;
       $174 = HEAP32[$arglist_current26>>2]|0;
       $arglist_next27 = (($arglist_current26) + 4|0);
       HEAP32[$ap>>2] = $arglist_next27;
       $$mask$i39 = $174 & 255;
       $1045 = 0;$1046 = $$mask$i39;
       label = 63;
       break L64;
       break;
      }
      case 17:  {
       $arglist_current29 = HEAP32[$ap>>2]|0;
       HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current29>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current29+4>>2];$175 = +HEAPF64[tempDoublePtr>>3];
       $arglist_next30 = (($arglist_current29) + 8|0);
       HEAP32[$ap>>2] = $arglist_next30;
       HEAPF64[tempDoublePtr>>3] = $175;$176 = HEAP32[tempDoublePtr>>2]|0;
       $177 = HEAP32[tempDoublePtr+4>>2]|0;
       $1045 = $177;$1046 = $176;
       label = 63;
       break L64;
       break;
      }
      case 18:  {
       $arglist_current32 = HEAP32[$ap>>2]|0;
       HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current32>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current32+4>>2];$178 = +HEAPF64[tempDoublePtr>>3];
       $arglist_next33 = (($arglist_current32) + 8|0);
       HEAP32[$ap>>2] = $arglist_next33;
       HEAPF64[tempDoublePtr>>3] = $178;$179 = HEAP32[tempDoublePtr>>2]|0;
       $180 = HEAP32[tempDoublePtr+4>>2]|0;
       $1043 = $179;$1044 = $180;
       label = 62;
       break L64;
       break;
      }
      default: {
       $1045 = $1040;$1046 = $1039;
       label = 63;
       break L64;
      }
      }
     } while(0);
    }
   }
  } while(0);
  if ((label|0) == 62) {
   label = 0;
   if ($1) {
    $1045 = $1044;$1046 = $1043;
    label = 63;
   } else {
    $1039 = $1043;$1040 = $1044;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $34;$l10n$0 = $l10n$3;
    continue;
   }
  }
  if ((label|0) == 63) {
   label = 0;
   $$pre270 = HEAP8[$fmt93$lcssa294>>0]|0;
   $182 = $$pre270;$191 = $1046;$218 = $1045;
  }
  $181 = $182 << 24 >> 24;
  $183 = ($st$0$lcssa295|0)!=(0);
  $184 = $181 & 15;
  $185 = ($184|0)==(3);
  $or$cond15 = $183 & $185;
  $186 = $181 & -33;
  $t$0 = $or$cond15 ? $186 : $181;
  $187 = $fl$1 & 8192;
  $188 = ($187|0)==(0);
  $189 = $fl$1 & -65537;
  $fl$1$ = $188 ? $fl$1 : $189;
  L88: do {
   switch ($t$0|0) {
   case 110:  {
    switch ($st$0$lcssa295|0) {
    case 0:  {
     $190 = $191;
     HEAP32[$190>>2] = $cnt$1;
     $1039 = $191;$1040 = $218;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 1:  {
     $192 = $191;
     HEAP32[$192>>2] = $cnt$1;
     $1039 = $191;$1040 = $218;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 2:  {
     $193 = ($cnt$1|0)<(0);
     $194 = $193 << 31 >> 31;
     $195 = $191;
     $196 = $195;
     $197 = $196;
     HEAP32[$197>>2] = $cnt$1;
     $198 = (($196) + 4)|0;
     $199 = $198;
     HEAP32[$199>>2] = $194;
     $1039 = $191;$1040 = $218;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 3:  {
     $200 = $cnt$1&65535;
     $201 = $191;
     HEAP16[$201>>1] = $200;
     $1039 = $191;$1040 = $218;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 4:  {
     $202 = $cnt$1&255;
     $203 = $191;
     HEAP8[$203>>0] = $202;
     $1039 = $191;$1040 = $218;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 6:  {
     $204 = $191;
     HEAP32[$204>>2] = $cnt$1;
     $1039 = $191;$1040 = $218;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 7:  {
     $205 = ($cnt$1|0)<(0);
     $206 = $205 << 31 >> 31;
     $207 = $191;
     $208 = $207;
     $209 = $208;
     HEAP32[$209>>2] = $cnt$1;
     $210 = (($208) + 4)|0;
     $211 = $210;
     HEAP32[$211>>2] = $206;
     $1039 = $191;$1040 = $218;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    default: {
     $1039 = $191;$1040 = $218;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
    }
    }
    break;
   }
   case 112:  {
    $212 = ($p$0>>>0)>(8);
    $213 = $212 ? $p$0 : 8;
    $214 = $fl$1$ | 8;
    $fl$3 = $214;$p$1 = $213;$t$1 = 120;
    label = 74;
    break;
   }
   case 88: case 120:  {
    $fl$3 = $fl$1$;$p$1 = $p$0;$t$1 = $t$0;
    label = 74;
    break;
   }
   case 111:  {
    $238 = ($191|0)==(0);
    $239 = ($218|0)==(0);
    $240 = $238 & $239;
    if ($240) {
     $$0$lcssa$i52 = $2;
    } else {
     $$03$i49 = $2;$242 = $191;$246 = $218;
     while(1) {
      $241 = $242 & 7;
      $243 = $241 | 48;
      $244 = $243&255;
      $245 = (($$03$i49) + -1|0);
      HEAP8[$245>>0] = $244;
      $247 = (_bitshift64Lshr(($242|0),($246|0),3)|0);
      $248 = tempRet0;
      $249 = ($247|0)==(0);
      $250 = ($248|0)==(0);
      $251 = $249 & $250;
      if ($251) {
       $$0$lcssa$i52 = $245;
       break;
      } else {
       $$03$i49 = $245;$242 = $247;$246 = $248;
      }
     }
    }
    $252 = $fl$1$ & 8;
    $253 = ($252|0)==(0);
    $or$cond19 = $253 | $240;
    $$25 = $or$cond19 ? 2512 : ((2512 + 5|0));
    $254 = $or$cond19&1;
    $$26 = $254 ^ 1;
    $293 = $191;$295 = $218;$a$0 = $$0$lcssa$i52;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $$26;$prefix$1 = $$25;
    label = 90;
    break;
   }
   case 105: case 100:  {
    $255 = ($218|0)<(0);
    if ($255) {
     $256 = (_i64Subtract(0,0,($191|0),($218|0))|0);
     $257 = tempRet0;
     $263 = $257;$265 = $256;$pl$0 = 1;$prefix$0 = 2512;
     label = 85;
     break L88;
    }
    $258 = $fl$1$ & 2048;
    $259 = ($258|0)==(0);
    if ($259) {
     $260 = $fl$1$ & 1;
     $261 = ($260|0)==(0);
     $$ = $261 ? 2512 : ((2512 + 2|0));
     $263 = $218;$265 = $191;$pl$0 = $260;$prefix$0 = $$;
     label = 85;
    } else {
     $263 = $218;$265 = $191;$pl$0 = 1;$prefix$0 = ((2512 + 1|0));
     label = 85;
    }
    break;
   }
   case 117:  {
    $263 = $218;$265 = $191;$pl$0 = 0;$prefix$0 = 2512;
    label = 85;
    break;
   }
   case 99:  {
    $304 = $191&255;
    HEAP8[$4>>0] = $304;
    $1047 = $191;$1048 = $218;$a$2 = $4;$fl$6 = $189;$p$5 = 1;$pl$2 = 0;$prefix$2 = 2512;$z$2 = $2;
    break;
   }
   case 109:  {
    $305 = (___errno_location()|0);
    $306 = HEAP32[$305>>2]|0;
    $307 = (_strerror(($306|0))|0);
    $a$1 = $307;
    label = 95;
    break;
   }
   case 115:  {
    $308 = $191;
    $309 = ($191|0)==(0);
    $$21 = $309 ? 2528 : $308;
    $a$1 = $$21;
    label = 95;
    break;
   }
   case 67:  {
    HEAP32[$wc>>2] = $191;
    HEAP32[$5>>2] = 0;
    $1051 = $wc;$1052 = $6;$p$4274 = -1;
    label = 100;
    break;
   }
   case 83:  {
    $316 = $191;
    $317 = ($p$0|0)==(0);
    if ($317) {
     $1053 = $191;$1054 = $316;$i$0$lcssa275 = 0;
     label = 105;
    } else {
     $1051 = $316;$1052 = $191;$p$4274 = $p$0;
     label = 100;
    }
    break;
   }
   case 65: case 71: case 70: case 69: case 97: case 103: case 102: case 101:  {
    HEAP32[tempDoublePtr>>2] = $191;HEAP32[tempDoublePtr+4>>2] = $218;$355 = +HEAPF64[tempDoublePtr>>3];
    HEAP32[$e2$i>>2] = 0;
    $356 = ($218|0)<(0);
    if ($356) {
     $357 = -$355;
     $$013$i = $357;$pl$0$i = 1;$prefix$0$i = 2536;
    } else {
     $358 = $fl$1$ & 2048;
     $359 = ($358|0)==(0);
     if ($359) {
      $360 = $fl$1$ & 1;
      $361 = ($360|0)==(0);
      $$$i = $361 ? ((2536 + 1|0)) : ((2536 + 6|0));
      $$013$i = $355;$pl$0$i = $360;$prefix$0$i = $$$i;
     } else {
      $$013$i = $355;$pl$0$i = 1;$prefix$0$i = ((2536 + 3|0));
     }
    }
    HEAPF64[tempDoublePtr>>3] = $$013$i;$362 = HEAP32[tempDoublePtr>>2]|0;
    $363 = HEAP32[tempDoublePtr+4>>2]|0;
    $364 = $363 & 2146435072;
    $365 = ($364>>>0)<(2146435072);
    $366 = (0)<(0);
    $367 = ($364|0)==(2146435072);
    $368 = $367 & $366;
    $369 = $365 | $368;
    if (!($369)) {
     $370 = $t$0 & 32;
     $371 = ($370|0)!=(0);
     $372 = $371 ? 2560 : 2568;
     $373 = ($$013$i != $$013$i) | (0.0 != 0.0);
     if ($373) {
      $374 = $371 ? 2576 : 2584;
      $pl$1$i = 0;$s1$0$i = $374;
     } else {
      $pl$1$i = $pl$0$i;$s1$0$i = $372;
     }
     $375 = (($pl$1$i) + 3)|0;
     $376 = $fl$1$ & 8192;
     $377 = ($376|0)==(0);
     $378 = ($w$1|0)>($375|0);
     $or$cond$i43$i = $377 & $378;
     if ($or$cond$i43$i) {
      $379 = (($w$1) - ($375))|0;
      $380 = ($379>>>0)>(256);
      $381 = $380 ? 256 : $379;
      _memset(($pad$i|0),32,($381|0))|0;
      $382 = ($379>>>0)>(255);
      if ($382) {
       $$01$i45$i = $379;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $383 = (($$01$i45$i) + -256)|0;
        $384 = ($383>>>0)>(255);
        if ($384) {
         $$01$i45$i = $383;
        } else {
         break;
        }
       }
       $385 = $379 & 255;
       $$0$lcssa$i47$i = $385;
      } else {
       $$0$lcssa$i47$i = $379;
      }
      (___fwritex($pad$i,$$0$lcssa$i47$i,$f)|0);
     }
     (___fwritex($prefix$0$i,$pl$1$i,$f)|0);
     (___fwritex($s1$0$i,3,$f)|0);
     $386 = $fl$1$ & 73728;
     $387 = ($386|0)==(8192);
     $or$cond$i50$i = $387 & $378;
     if ($or$cond$i50$i) {
      $388 = (($w$1) - ($375))|0;
      $389 = ($388>>>0)>(256);
      $390 = $389 ? 256 : $388;
      _memset(($pad$i|0),32,($390|0))|0;
      $391 = ($388>>>0)>(255);
      if ($391) {
       $$01$i52$i = $388;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $392 = (($$01$i52$i) + -256)|0;
        $393 = ($392>>>0)>(255);
        if ($393) {
         $$01$i52$i = $392;
        } else {
         break;
        }
       }
       $394 = $388 & 255;
       $$0$lcssa$i54$i = $394;
      } else {
       $$0$lcssa$i54$i = $388;
      }
      (___fwritex($pad$i,$$0$lcssa$i54$i,$f)|0);
     }
     $w$$i = $378 ? $w$1 : $375;
     $1039 = $191;$1040 = $218;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $w$$i;$l10n$0 = $l10n$3;
     continue L1;
    }
    $395 = (+_frexpl($$013$i,$e2$i));
    $396 = $395 * 2.0;
    $397 = $396 != 0.0;
    if ($397) {
     $398 = HEAP32[$e2$i>>2]|0;
     $399 = (($398) + -1)|0;
     HEAP32[$e2$i>>2] = $399;
    }
    $400 = $t$0 | 32;
    $401 = ($400|0)==(97);
    if ($401) {
     $402 = $t$0 & 32;
     $403 = ($402|0)==(0);
     $404 = (($prefix$0$i) + 9|0);
     $prefix$0$$i = $403 ? $prefix$0$i : $404;
     $405 = $pl$0$i | 2;
     $406 = ($p$0>>>0)>(11);
     $407 = (12 - ($p$0))|0;
     $re$0$i = $406 ? 0 : $407;
     $408 = ($re$0$i|0)==(0);
     do {
      if ($408) {
       $$1$i = $396;
      } else {
       $re$1187$i = $re$0$i;$round$0186$i = 8.0;
       while(1) {
        $409 = (($re$1187$i) + -1)|0;
        $410 = $round$0186$i * 16.0;
        $411 = ($409|0)==(0);
        if ($411) {
         $$lcssa324 = $410;
         break;
        } else {
         $re$1187$i = $409;$round$0186$i = $410;
        }
       }
       $412 = HEAP8[$prefix$0$$i>>0]|0;
       $413 = ($412<<24>>24)==(45);
       if ($413) {
        $414 = -$396;
        $415 = $414 - $$lcssa324;
        $416 = $$lcssa324 + $415;
        $417 = -$416;
        $$1$i = $417;
        break;
       } else {
        $418 = $396 + $$lcssa324;
        $419 = $418 - $$lcssa324;
        $$1$i = $419;
        break;
       }
      }
     } while(0);
     $420 = HEAP32[$e2$i>>2]|0;
     $421 = ($420|0)<(0);
     $422 = (0 - ($420))|0;
     $423 = $421 ? $422 : $420;
     $424 = ($423|0)<(0);
     if ($424) {
      $425 = ($423|0)<(0);
      $426 = $425 << 31 >> 31;
      $$05$i$i = $7;$427 = $423;$428 = $426;
      while(1) {
       $429 = (___uremdi3(($427|0),($428|0),10,0)|0);
       $430 = tempRet0;
       $431 = $429 | 48;
       $432 = $431&255;
       $433 = (($$05$i$i) + -1|0);
       HEAP8[$433>>0] = $432;
       $434 = (___udivdi3(($427|0),($428|0),10,0)|0);
       $435 = tempRet0;
       $436 = ($428>>>0)>(9);
       $437 = ($427>>>0)>(4294967295);
       $438 = ($428|0)==(9);
       $439 = $438 & $437;
       $440 = $436 | $439;
       if ($440) {
        $$05$i$i = $433;$427 = $434;$428 = $435;
       } else {
        $$lcssa325 = $433;$1055 = $434;$1056 = $435;
        break;
       }
      }
      $$0$lcssa$i56$i = $$lcssa325;$$01$lcssa$off0$i$i = $1055;
     } else {
      $$0$lcssa$i56$i = $7;$$01$lcssa$off0$i$i = $423;
     }
     $441 = ($$01$lcssa$off0$i$i|0)==(0);
     if ($441) {
      $$1$lcssa$i$i = $$0$lcssa$i56$i;
     } else {
      $$12$i$i = $$0$lcssa$i56$i;$y$03$i$i = $$01$lcssa$off0$i$i;
      while(1) {
       $442 = (($y$03$i$i>>>0) % 10)&-1;
       $443 = $442 | 48;
       $444 = $443&255;
       $445 = (($$12$i$i) + -1|0);
       HEAP8[$445>>0] = $444;
       $446 = (($y$03$i$i>>>0) / 10)&-1;
       $447 = ($y$03$i$i>>>0)<(10);
       if ($447) {
        $$1$lcssa$i$i = $445;
        break;
       } else {
        $$12$i$i = $445;$y$03$i$i = $446;
       }
      }
     }
     $448 = ($$1$lcssa$i$i|0)==($7|0);
     if ($448) {
      HEAP8[$8>>0] = 48;
      $estr$0$i = $8;
     } else {
      $estr$0$i = $$1$lcssa$i$i;
     }
     $449 = HEAP32[$e2$i>>2]|0;
     $450 = $449 >> 31;
     $451 = $450 & 2;
     $452 = (($451) + 43)|0;
     $453 = $452&255;
     $454 = (($estr$0$i) + -1|0);
     HEAP8[$454>>0] = $453;
     $455 = (($t$0) + 15)|0;
     $456 = $455&255;
     $457 = (($estr$0$i) + -2|0);
     HEAP8[$457>>0] = $456;
     $notrhs$i = ($p$0|0)<(1);
     if ($notrhs$i) {
      $458 = $fl$1$ & 8;
      $459 = ($458|0)==(0);
      if ($459) {
       $$2$us$us$i = $$1$i;$s$0$us$us$i = $buf$i;
       while(1) {
        $460 = (~~(($$2$us$us$i)));
        $461 = (2592 + ($460)|0);
        $462 = HEAP8[$461>>0]|0;
        $463 = $462&255;
        $464 = $463 | $402;
        $465 = $464&255;
        $466 = (($s$0$us$us$i) + 1|0);
        HEAP8[$s$0$us$us$i>>0] = $465;
        $467 = (+($460|0));
        $468 = $$2$us$us$i - $467;
        $469 = $468 * 16.0;
        $470 = $466;
        $471 = (($470) - ($0))|0;
        $472 = ($471|0)!=(1);
        $notlhs$us$us$i = $469 == 0.0;
        $or$cond$i80 = $472 | $notlhs$us$us$i;
        if ($or$cond$i80) {
         $s$1$us$us$i = $466;
        } else {
         $473 = (($s$0$us$us$i) + 2|0);
         HEAP8[$466>>0] = 46;
         $s$1$us$us$i = $473;
        }
        $474 = $469 != 0.0;
        if ($474) {
         $$2$us$us$i = $469;$s$0$us$us$i = $s$1$us$us$i;
        } else {
         $s$1$lcssa$i = $s$1$us$us$i;
         break;
        }
       }
      } else {
       $$2$us$i = $$1$i;$s$0$us$i = $buf$i;
       while(1) {
        $475 = (~~(($$2$us$i)));
        $476 = (2592 + ($475)|0);
        $477 = HEAP8[$476>>0]|0;
        $478 = $477&255;
        $479 = $478 | $402;
        $480 = $479&255;
        $481 = (($s$0$us$i) + 1|0);
        HEAP8[$s$0$us$i>>0] = $480;
        $482 = (+($475|0));
        $483 = $$2$us$i - $482;
        $484 = $483 * 16.0;
        $485 = $481;
        $486 = (($485) - ($0))|0;
        $487 = ($486|0)==(1);
        if ($487) {
         $488 = (($s$0$us$i) + 2|0);
         HEAP8[$481>>0] = 46;
         $s$1$us$i = $488;
        } else {
         $s$1$us$i = $481;
        }
        $489 = $484 != 0.0;
        if ($489) {
         $$2$us$i = $484;$s$0$us$i = $s$1$us$i;
        } else {
         $s$1$lcssa$i = $s$1$us$i;
         break;
        }
       }
      }
     } else {
      $$2$i = $$1$i;$s$0$i = $buf$i;
      while(1) {
       $490 = (~~(($$2$i)));
       $491 = (2592 + ($490)|0);
       $492 = HEAP8[$491>>0]|0;
       $493 = $492&255;
       $494 = $493 | $402;
       $495 = $494&255;
       $496 = (($s$0$i) + 1|0);
       HEAP8[$s$0$i>>0] = $495;
       $497 = (+($490|0));
       $498 = $$2$i - $497;
       $499 = $498 * 16.0;
       $500 = $496;
       $501 = (($500) - ($0))|0;
       $502 = ($501|0)==(1);
       if ($502) {
        $503 = (($s$0$i) + 2|0);
        HEAP8[$496>>0] = 46;
        $s$1$i = $503;
       } else {
        $s$1$i = $496;
       }
       $504 = $499 != 0.0;
       if ($504) {
        $$2$i = $499;$s$0$i = $s$1$i;
       } else {
        $s$1$lcssa$i = $s$1$i;
        break;
       }
      }
     }
     $505 = ($p$0|0)!=(0);
     $$pre308$i = $s$1$lcssa$i;
     $506 = (($11) + ($$pre308$i))|0;
     $507 = ($506|0)<($p$0|0);
     $or$cond279 = $505 & $507;
     $508 = $457;
     if ($or$cond279) {
      $509 = (($12) + ($p$0))|0;
      $510 = (($509) - ($508))|0;
      $l$0$i = $510;
     } else {
      $511 = (($10) - ($508))|0;
      $512 = (($511) + ($$pre308$i))|0;
      $l$0$i = $512;
     }
     $513 = (($l$0$i) + ($405))|0;
     $514 = $fl$1$ & 73728;
     $515 = ($514|0)==(0);
     $516 = ($w$1|0)>($513|0);
     $or$cond$i60$i = $515 & $516;
     if ($or$cond$i60$i) {
      $517 = (($w$1) - ($513))|0;
      $518 = ($517>>>0)>(256);
      $519 = $518 ? 256 : $517;
      _memset(($pad$i|0),32,($519|0))|0;
      $520 = ($517>>>0)>(255);
      if ($520) {
       $$01$i62$i = $517;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $521 = (($$01$i62$i) + -256)|0;
        $522 = ($521>>>0)>(255);
        if ($522) {
         $$01$i62$i = $521;
        } else {
         break;
        }
       }
       $523 = $517 & 255;
       $$0$lcssa$i64$i = $523;
      } else {
       $$0$lcssa$i64$i = $517;
      }
      (___fwritex($pad$i,$$0$lcssa$i64$i,$f)|0);
     }
     (___fwritex($prefix$0$$i,$405,$f)|0);
     $524 = ($514|0)==(65536);
     $or$cond$i67$i = $524 & $516;
     if ($or$cond$i67$i) {
      $525 = (($w$1) - ($513))|0;
      $526 = ($525>>>0)>(256);
      $527 = $526 ? 256 : $525;
      _memset(($pad$i|0),48,($527|0))|0;
      $528 = ($525>>>0)>(255);
      if ($528) {
       $$01$i69$i = $525;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $529 = (($$01$i69$i) + -256)|0;
        $530 = ($529>>>0)>(255);
        if ($530) {
         $$01$i69$i = $529;
        } else {
         break;
        }
       }
       $531 = $525 & 255;
       $$0$lcssa$i71$i = $531;
      } else {
       $$0$lcssa$i71$i = $525;
      }
      (___fwritex($pad$i,$$0$lcssa$i71$i,$f)|0);
     }
     $532 = (($$pre308$i) - ($0))|0;
     (___fwritex($buf$i,$532,$f)|0);
     $533 = $457;
     $534 = (($9) - ($533))|0;
     $535 = (($l$0$i) - ($534))|0;
     $536 = (($535) - ($532))|0;
     $537 = ($536|0)>(0);
     if ($537) {
      $538 = ($536>>>0)>(256);
      $539 = $538 ? 256 : $536;
      _memset(($pad$i|0),48,($539|0))|0;
      $540 = ($536>>>0)>(255);
      if ($540) {
       $$01$i75$i = $536;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $541 = (($$01$i75$i) + -256)|0;
        $542 = ($541>>>0)>(255);
        if ($542) {
         $$01$i75$i = $541;
        } else {
         break;
        }
       }
       $543 = $536 & 255;
       $$0$lcssa$i77$i = $543;
      } else {
       $$0$lcssa$i77$i = $536;
      }
      (___fwritex($pad$i,$$0$lcssa$i77$i,$f)|0);
     }
     (___fwritex($457,$534,$f)|0);
     $544 = ($514|0)==(8192);
     $or$cond$i80$i = $544 & $516;
     if ($or$cond$i80$i) {
      $545 = (($w$1) - ($513))|0;
      $546 = ($545>>>0)>(256);
      $547 = $546 ? 256 : $545;
      _memset(($pad$i|0),32,($547|0))|0;
      $548 = ($545>>>0)>(255);
      if ($548) {
       $$01$i82$i = $545;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $549 = (($$01$i82$i) + -256)|0;
        $550 = ($549>>>0)>(255);
        if ($550) {
         $$01$i82$i = $549;
        } else {
         break;
        }
       }
       $551 = $545 & 255;
       $$0$lcssa$i84$i = $551;
      } else {
       $$0$lcssa$i84$i = $545;
      }
      (___fwritex($pad$i,$$0$lcssa$i84$i,$f)|0);
     }
     $w$25$i = $516 ? $w$1 : $513;
     $1039 = $191;$1040 = $218;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $w$25$i;$l10n$0 = $l10n$3;
     continue L1;
    }
    $552 = ($p$0|0)<(0);
    $$p$i = $552 ? 6 : $p$0;
    if ($397) {
     $553 = $396 * 268435456.0;
     $554 = HEAP32[$e2$i>>2]|0;
     $555 = (($554) + -28)|0;
     HEAP32[$e2$i>>2] = $555;
     $$3$i = $553;$557 = $555;
    } else {
     $$pre$i = HEAP32[$e2$i>>2]|0;
     $$3$i = $396;$557 = $$pre$i;
    }
    $556 = ($557|0)<(0);
    $$39$i = $556 ? $big$i : $13;
    $558 = $$39$i;
    $$4$i = $$3$i;$z$0$i = $$39$i;
    while(1) {
     $559 = (~~(($$4$i))>>>0);
     HEAP32[$z$0$i>>2] = $559;
     $560 = (($z$0$i) + 4|0);
     $561 = (+($559>>>0));
     $562 = $$4$i - $561;
     $563 = $562 * 1.0E+9;
     $564 = $563 != 0.0;
     if ($564) {
      $$4$i = $563;$z$0$i = $560;
     } else {
      $$lcssa301 = $560;
      break;
     }
    }
    $$pr$i = HEAP32[$e2$i>>2]|0;
    $565 = ($$pr$i|0)>(0);
    if ($565) {
     $567 = $$pr$i;$a$1261$i = $$39$i;$z$1260$i = $$lcssa301;
     while(1) {
      $566 = ($567|0)>(29);
      $568 = $566 ? 29 : $567;
      $d$0253$i = (($z$1260$i) + -4|0);
      $569 = ($d$0253$i>>>0)<($a$1261$i>>>0);
      do {
       if ($569) {
        $a$2$ph$i = $a$1261$i;
       } else {
        $579 = $z$1260$i;$carry$0254$i = 0;$d$0255$i = $d$0253$i;
        while(1) {
         $570 = HEAP32[$d$0255$i>>2]|0;
         $571 = (_bitshift64Shl(($570|0),0,($568|0))|0);
         $572 = tempRet0;
         $573 = (_i64Add(($571|0),($572|0),($carry$0254$i|0),0)|0);
         $574 = tempRet0;
         $575 = (___uremdi3(($573|0),($574|0),1000000000,0)|0);
         $576 = tempRet0;
         HEAP32[$d$0255$i>>2] = $575;
         $577 = (___udivdi3(($573|0),($574|0),1000000000,0)|0);
         $578 = tempRet0;
         $d$0$i = (($579) + -8|0);
         $580 = ($d$0$i>>>0)<($a$1261$i>>>0);
         if ($580) {
          $$lcssa302 = $577;
          break;
         } else {
          $579$phi = $d$0255$i;$carry$0254$i = $577;$d$0255$i = $d$0$i;$579 = $579$phi;
         }
        }
        $581 = ($$lcssa302|0)==(0);
        if ($581) {
         $a$2$ph$i = $a$1261$i;
         break;
        }
        $582 = (($a$1261$i) + -4|0);
        HEAP32[$582>>2] = $$lcssa302;
        $a$2$ph$i = $582;
       }
      } while(0);
      $z$2$i = $z$1260$i;
      while(1) {
       $583 = ($z$2$i>>>0)>($a$2$ph$i>>>0);
       if (!($583)) {
        $z$2$i$lcssa = $z$2$i;
        break;
       }
       $584 = (($z$2$i) + -4|0);
       $585 = HEAP32[$584>>2]|0;
       $586 = ($585|0)==(0);
       if ($586) {
        $z$2$i = $584;
       } else {
        $z$2$i$lcssa = $z$2$i;
        break;
       }
      }
      $587 = HEAP32[$e2$i>>2]|0;
      $588 = (($587) - ($568))|0;
      HEAP32[$e2$i>>2] = $588;
      $589 = ($588|0)>(0);
      if ($589) {
       $567 = $588;$a$1261$i = $a$2$ph$i;$z$1260$i = $z$2$i$lcssa;
      } else {
       $$pr154$i = $588;$a$1$lcssa$i = $a$2$ph$i;$z$1$lcssa$i = $z$2$i$lcssa;
       break;
      }
     }
    } else {
     $$pr154$i = $$pr$i;$a$1$lcssa$i = $$39$i;$z$1$lcssa$i = $$lcssa301;
    }
    $590 = ($$pr154$i|0)<(0);
    L246: do {
     if ($590) {
      $591 = (($$p$i) + 25)|0;
      $592 = (($591|0) / 9)&-1;
      $593 = (($592) + 1)|0;
      $594 = ($400|0)==(102);
      if ($594) {
       $595 = (($$39$i) + ($593<<2)|0);
       $597 = $$pr154$i;$a$3248$us$i = $a$1$lcssa$i;$z$3247$us$i = $z$1$lcssa$i;
       while(1) {
        $596 = ($597|0)<(-9);
        $598 = (0 - ($597))|0;
        $$26$us$i = $596 ? 9 : $598;
        $599 = ($a$3248$us$i>>>0)<($z$3247$us$i>>>0);
        do {
         if ($599) {
          $624 = 1 << $$26$us$i;
          $617 = (($624) + -1)|0;
          $621 = 1000000000 >>> $$26$us$i;
          $carry3$0242$us$i = 0;$d$1241$us$i = $a$3248$us$i;
          while(1) {
           $615 = HEAP32[$d$1241$us$i>>2]|0;
           $616 = $615 & $617;
           $618 = $615 >>> $$26$us$i;
           $619 = (($618) + ($carry3$0242$us$i))|0;
           HEAP32[$d$1241$us$i>>2] = $619;
           $620 = Math_imul($616, $621)|0;
           $622 = (($d$1241$us$i) + 4|0);
           $623 = ($622>>>0)<($z$3247$us$i>>>0);
           if ($623) {
            $carry3$0242$us$i = $620;$d$1241$us$i = $622;
           } else {
            $$lcssa305 = $620;
            break;
           }
          }
          $603 = HEAP32[$a$3248$us$i>>2]|0;
          $604 = ($603|0)==(0);
          $605 = (($a$3248$us$i) + 4|0);
          $$a$3$us$i = $604 ? $605 : $a$3248$us$i;
          $606 = ($$lcssa305|0)==(0);
          if ($606) {
           $$a$3$us310$i = $$a$3$us$i;$z$4$us$i = $z$3247$us$i;
           break;
          }
          $607 = (($z$3247$us$i) + 4|0);
          HEAP32[$z$3247$us$i>>2] = $$lcssa305;
          $$a$3$us310$i = $$a$3$us$i;$z$4$us$i = $607;
         } else {
          $600 = HEAP32[$a$3248$us$i>>2]|0;
          $601 = ($600|0)==(0);
          $602 = (($a$3248$us$i) + 4|0);
          $$a$3$us309$i = $601 ? $602 : $a$3248$us$i;
          $$a$3$us310$i = $$a$3$us309$i;$z$4$us$i = $z$3247$us$i;
         }
        } while(0);
        $608 = $z$4$us$i;
        $609 = (($608) - ($558))|0;
        $610 = $609 >> 2;
        $611 = ($610|0)>($593|0);
        $$z$4$us$i = $611 ? $595 : $z$4$us$i;
        $612 = HEAP32[$e2$i>>2]|0;
        $613 = (($612) + ($$26$us$i))|0;
        HEAP32[$e2$i>>2] = $613;
        $614 = ($613|0)<(0);
        if ($614) {
         $597 = $613;$a$3248$us$i = $$a$3$us310$i;$z$3247$us$i = $$z$4$us$i;
        } else {
         $a$3$lcssa$i = $$a$3$us310$i;$z$3$lcssa$i = $$z$4$us$i;
         break L246;
        }
       }
      } else {
       $626 = $$pr154$i;$a$3248$i = $a$1$lcssa$i;$z$3247$i = $z$1$lcssa$i;
      }
      while(1) {
       $625 = ($626|0)<(-9);
       $627 = (0 - ($626))|0;
       $$26$i = $625 ? 9 : $627;
       $628 = ($a$3248$i>>>0)<($z$3247$i>>>0);
       do {
        if ($628) {
         $632 = 1 << $$26$i;
         $633 = (($632) + -1)|0;
         $634 = 1000000000 >>> $$26$i;
         $carry3$0242$i = 0;$d$1241$i = $a$3248$i;
         while(1) {
          $635 = HEAP32[$d$1241$i>>2]|0;
          $636 = $635 & $633;
          $637 = $635 >>> $$26$i;
          $638 = (($637) + ($carry3$0242$i))|0;
          HEAP32[$d$1241$i>>2] = $638;
          $639 = Math_imul($636, $634)|0;
          $640 = (($d$1241$i) + 4|0);
          $641 = ($640>>>0)<($z$3247$i>>>0);
          if ($641) {
           $carry3$0242$i = $639;$d$1241$i = $640;
          } else {
           $$lcssa304 = $639;
           break;
          }
         }
         $642 = HEAP32[$a$3248$i>>2]|0;
         $643 = ($642|0)==(0);
         $644 = (($a$3248$i) + 4|0);
         $$a$3$i = $643 ? $644 : $a$3248$i;
         $645 = ($$lcssa304|0)==(0);
         if ($645) {
          $$a$3312$i = $$a$3$i;$z$4$i = $z$3247$i;
          break;
         }
         $646 = (($z$3247$i) + 4|0);
         HEAP32[$z$3247$i>>2] = $$lcssa304;
         $$a$3312$i = $$a$3$i;$z$4$i = $646;
        } else {
         $629 = HEAP32[$a$3248$i>>2]|0;
         $630 = ($629|0)==(0);
         $631 = (($a$3248$i) + 4|0);
         $$a$3311$i = $630 ? $631 : $a$3248$i;
         $$a$3312$i = $$a$3311$i;$z$4$i = $z$3247$i;
        }
       } while(0);
       $647 = $z$4$i;
       $648 = $$a$3312$i;
       $649 = (($647) - ($648))|0;
       $650 = $649 >> 2;
       $651 = ($650|0)>($593|0);
       if ($651) {
        $652 = (($$a$3312$i) + ($593<<2)|0);
        $z$5$i = $652;
       } else {
        $z$5$i = $z$4$i;
       }
       $653 = HEAP32[$e2$i>>2]|0;
       $654 = (($653) + ($$26$i))|0;
       HEAP32[$e2$i>>2] = $654;
       $655 = ($654|0)<(0);
       if ($655) {
        $626 = $654;$a$3248$i = $$a$3312$i;$z$3247$i = $z$5$i;
       } else {
        $a$3$lcssa$i = $$a$3312$i;$z$3$lcssa$i = $z$5$i;
        break;
       }
      }
     } else {
      $a$3$lcssa$i = $a$1$lcssa$i;$z$3$lcssa$i = $z$1$lcssa$i;
     }
    } while(0);
    $656 = ($a$3$lcssa$i>>>0)<($z$3$lcssa$i>>>0);
    do {
     if ($656) {
      $657 = $a$3$lcssa$i;
      $658 = (($558) - ($657))|0;
      $659 = $658 >> 2;
      $660 = ($659*9)|0;
      $661 = HEAP32[$a$3$lcssa$i>>2]|0;
      $662 = ($661>>>0)<(10);
      if ($662) {
       $e$1$i = $660;
       break;
      } else {
       $e$0237$i = $660;$i$0236$i = 10;
      }
      while(1) {
       $663 = ($i$0236$i*10)|0;
       $664 = (($e$0237$i) + 1)|0;
       $665 = ($661>>>0)<($663>>>0);
       if ($665) {
        $e$1$i = $664;
        break;
       } else {
        $e$0237$i = $664;$i$0236$i = $663;
       }
      }
     } else {
      $e$1$i = 0;
     }
    } while(0);
    $666 = ($400|0)!=(102);
    $667 = $666 ? $e$1$i : 0;
    $668 = (($$p$i) - ($667))|0;
    $669 = ($400|0)==(103);
    $670 = ($$p$i|0)!=(0);
    $$27$i = $669 & $670;
    $$neg159$i = $$27$i << 31 >> 31;
    $671 = (($668) + ($$neg159$i))|0;
    $672 = $z$3$lcssa$i;
    $673 = (($672) - ($558))|0;
    $674 = $673 >> 2;
    $675 = ($674*9)|0;
    $676 = (($675) + -9)|0;
    $677 = ($671|0)<($676|0);
    if ($677) {
     $678 = (($671) + 9216)|0;
     $679 = (($678|0) / 9)&-1;
     $$sum$i = (($679) + -1023)|0;
     $680 = (($$39$i) + ($$sum$i<<2)|0);
     $681 = (($678|0) % 9)&-1;
     $j$0229$i = (($681) + 1)|0;
     $682 = ($j$0229$i|0)<(9);
     if ($682) {
      $i$1230$i = 10;$j$0231$i = $j$0229$i;
      while(1) {
       $683 = ($i$1230$i*10)|0;
       $j$0$i = (($j$0231$i) + 1)|0;
       $exitcond$i = ($j$0$i|0)==(9);
       if ($exitcond$i) {
        $i$1$lcssa$i = $683;
        break;
       } else {
        $i$1230$i = $683;$j$0231$i = $j$0$i;
       }
      }
     } else {
      $i$1$lcssa$i = 10;
     }
     $684 = HEAP32[$680>>2]|0;
     $685 = (($684>>>0) % ($i$1$lcssa$i>>>0))&-1;
     $686 = ($685|0)==(0);
     if ($686) {
      $$sum21$i = (($679) + -1022)|0;
      $687 = (($$39$i) + ($$sum21$i<<2)|0);
      $688 = ($687|0)==($z$3$lcssa$i|0);
      if ($688) {
       $a$7$i = $a$3$lcssa$i;$d$3$i = $680;$e$3$i = $e$1$i;
      } else {
       label = 231;
      }
     } else {
      label = 231;
     }
     do {
      if ((label|0) == 231) {
       label = 0;
       $689 = (($684>>>0) / ($i$1$lcssa$i>>>0))&-1;
       $690 = $689 & 1;
       $691 = ($690|0)==(0);
       $$28$i = $691 ? 9007199254740992.0 : 9007199254740994.0;
       $692 = (($i$1$lcssa$i|0) / 2)&-1;
       $693 = ($685>>>0)<($692>>>0);
       do {
        if ($693) {
         $small$0$i = 0.5;
        } else {
         $694 = ($685|0)==($692|0);
         if ($694) {
          $$sum22$i = (($679) + -1022)|0;
          $695 = (($$39$i) + ($$sum22$i<<2)|0);
          $696 = ($695|0)==($z$3$lcssa$i|0);
          if ($696) {
           $small$0$i = 1.0;
           break;
          }
         }
         $small$0$i = 1.5;
        }
       } while(0);
       $697 = ($pl$0$i|0)==(0);
       do {
        if ($697) {
         $round6$1$i = $$28$i;$small$1$i = $small$0$i;
        } else {
         $698 = HEAP8[$prefix$0$i>>0]|0;
         $699 = ($698<<24>>24)==(45);
         if (!($699)) {
          $round6$1$i = $$28$i;$small$1$i = $small$0$i;
          break;
         }
         $700 = -$$28$i;
         $701 = -$small$0$i;
         $round6$1$i = $700;$small$1$i = $701;
        }
       } while(0);
       $702 = (($684) - ($685))|0;
       HEAP32[$680>>2] = $702;
       $703 = $round6$1$i + $small$1$i;
       $704 = $703 != $round6$1$i;
       if (!($704)) {
        $a$7$i = $a$3$lcssa$i;$d$3$i = $680;$e$3$i = $e$1$i;
        break;
       }
       $705 = (($702) + ($i$1$lcssa$i))|0;
       HEAP32[$680>>2] = $705;
       $706 = ($705>>>0)>(999999999);
       if ($706) {
        $a$5223$i = $a$3$lcssa$i;$d$2222$i = $680;
        while(1) {
         $707 = (($d$2222$i) + -4|0);
         HEAP32[$d$2222$i>>2] = 0;
         $708 = ($707>>>0)<($a$5223$i>>>0);
         if ($708) {
          $709 = (($a$5223$i) + -4|0);
          HEAP32[$709>>2] = 0;
          $a$6$i = $709;
         } else {
          $a$6$i = $a$5223$i;
         }
         $710 = HEAP32[$707>>2]|0;
         $711 = (($710) + 1)|0;
         HEAP32[$707>>2] = $711;
         $712 = ($711>>>0)>(999999999);
         if ($712) {
          $a$5223$i = $a$6$i;$d$2222$i = $707;
         } else {
          $a$5$lcssa$i = $a$6$i;$d$2$lcssa$i = $707;
          break;
         }
        }
       } else {
        $a$5$lcssa$i = $a$3$lcssa$i;$d$2$lcssa$i = $680;
       }
       $713 = $a$5$lcssa$i;
       $714 = (($558) - ($713))|0;
       $715 = $714 >> 2;
       $716 = ($715*9)|0;
       $717 = HEAP32[$a$5$lcssa$i>>2]|0;
       $718 = ($717>>>0)<(10);
       if ($718) {
        $a$7$i = $a$5$lcssa$i;$d$3$i = $d$2$lcssa$i;$e$3$i = $716;
        break;
       } else {
        $e$2218$i = $716;$i$2217$i = 10;
       }
       while(1) {
        $719 = ($i$2217$i*10)|0;
        $720 = (($e$2218$i) + 1)|0;
        $721 = ($717>>>0)<($719>>>0);
        if ($721) {
         $a$7$i = $a$5$lcssa$i;$d$3$i = $d$2$lcssa$i;$e$3$i = $720;
         break;
        } else {
         $e$2218$i = $720;$i$2217$i = $719;
        }
       }
      }
     } while(0);
     $722 = (($d$3$i) + 4|0);
     $723 = ($z$3$lcssa$i>>>0)>($722>>>0);
     $$z$3$i = $723 ? $722 : $z$3$lcssa$i;
     $a$8$ph$i = $a$7$i;$e$4$ph$i = $e$3$i;$z$6$ph$i = $$z$3$i;
    } else {
     $a$8$ph$i = $a$3$lcssa$i;$e$4$ph$i = $e$1$i;$z$6$ph$i = $z$3$lcssa$i;
    }
    $a$8$ph294$i = $a$8$ph$i;
    $724 = (0 - ($e$4$ph$i))|0;
    $z$6$i = $z$6$ph$i;
    while(1) {
     $725 = ($z$6$i>>>0)>($a$8$ph$i>>>0);
     if (!($725)) {
      $$lcssa283$i = 0;$z$6$i$lcssa = $z$6$i;
      break;
     }
     $726 = (($z$6$i) + -4|0);
     $727 = HEAP32[$726>>2]|0;
     $728 = ($727|0)==(0);
     if ($728) {
      $z$6$i = $726;
     } else {
      $$lcssa283$i = 1;$z$6$i$lcssa = $z$6$i;
      break;
     }
    }
    do {
     if ($669) {
      $729 = ($$p$i|0)==(0);
      $730 = $729&1;
      $$$p$i = (($730) + ($$p$i))|0;
      $731 = ($$$p$i|0)>($e$4$ph$i|0);
      $732 = ($e$4$ph$i|0)>(-5);
      $or$cond6$i = $731 & $732;
      if ($or$cond6$i) {
       $733 = (($t$0) + -1)|0;
       $$neg160$i = (($$$p$i) + -1)|0;
       $734 = (($$neg160$i) - ($e$4$ph$i))|0;
       $$019$i = $733;$$216$i = $734;
      } else {
       $735 = (($t$0) + -2)|0;
       $736 = (($$$p$i) + -1)|0;
       $$019$i = $735;$$216$i = $736;
      }
      $737 = $fl$1$ & 8;
      $738 = ($737|0)==(0);
      if (!($738)) {
       $$120$i = $$019$i;$$317$i = $$216$i;
       break;
      }
      do {
       if ($$lcssa283$i) {
        $739 = (($z$6$i$lcssa) + -4|0);
        $740 = HEAP32[$739>>2]|0;
        $741 = ($740|0)==(0);
        if ($741) {
         $j$2$i = 9;
         break;
        }
        $742 = (($740>>>0) % 10)&-1;
        $743 = ($742|0)==(0);
        if ($743) {
         $i$3213$i = 10;$j$1214$i = 0;
        } else {
         $j$2$i = 0;
         break;
        }
        while(1) {
         $744 = ($i$3213$i*10)|0;
         $745 = (($j$1214$i) + 1)|0;
         $746 = (($740>>>0) % ($744>>>0))&-1;
         $747 = ($746|0)==(0);
         if ($747) {
          $i$3213$i = $744;$j$1214$i = $745;
         } else {
          $j$2$i = $745;
          break;
         }
        }
       } else {
        $j$2$i = 9;
       }
      } while(0);
      $748 = $$019$i | 32;
      $749 = ($748|0)==(102);
      $750 = $z$6$i$lcssa;
      $751 = (($750) - ($558))|0;
      $752 = $751 >> 2;
      $753 = ($752*9)|0;
      $754 = (($753) + -9)|0;
      if ($749) {
       $755 = (($754) - ($j$2$i))|0;
       $756 = ($755|0)<(0);
       $$29$i = $756 ? 0 : $755;
       $757 = ($$216$i|0)<($$29$i|0);
       $$216$$29$i = $757 ? $$216$i : $$29$i;
       $$120$i = $$019$i;$$317$i = $$216$$29$i;
       break;
      } else {
       $758 = (($754) + ($e$4$ph$i))|0;
       $759 = (($758) - ($j$2$i))|0;
       $760 = ($759|0)<(0);
       $$31$i = $760 ? 0 : $759;
       $761 = ($$216$i|0)<($$31$i|0);
       $$216$$31$i = $761 ? $$216$i : $$31$i;
       $$120$i = $$019$i;$$317$i = $$216$$31$i;
       break;
      }
     } else {
      $$120$i = $t$0;$$317$i = $$p$i;
     }
    } while(0);
    $762 = ($$317$i|0)!=(0);
    if ($762) {
     $766 = 1;
    } else {
     $763 = $fl$1$ & 8;
     $764 = ($763|0)!=(0);
     $766 = $764;
    }
    $765 = $766&1;
    $767 = $$120$i | 32;
    $768 = ($767|0)==(102);
    if ($768) {
     $769 = ($e$4$ph$i|0)>(0);
     $770 = $769 ? $e$4$ph$i : 0;
     $$pn$i = $770;$estr$2$i = 0;
    } else {
     $771 = ($e$4$ph$i|0)<(0);
     $772 = $771 ? $724 : $e$4$ph$i;
     $773 = ($772|0)<(0);
     if ($773) {
      $774 = ($772|0)<(0);
      $775 = $774 << 31 >> 31;
      $$05$i87$i = $7;$776 = $772;$777 = $775;
      while(1) {
       $778 = (___uremdi3(($776|0),($777|0),10,0)|0);
       $779 = tempRet0;
       $780 = $778 | 48;
       $781 = $780&255;
       $782 = (($$05$i87$i) + -1|0);
       HEAP8[$782>>0] = $781;
       $783 = (___udivdi3(($776|0),($777|0),10,0)|0);
       $784 = tempRet0;
       $785 = ($777>>>0)>(9);
       $786 = ($776>>>0)>(4294967295);
       $787 = ($777|0)==(9);
       $788 = $787 & $786;
       $789 = $785 | $788;
       if ($789) {
        $$05$i87$i = $782;$776 = $783;$777 = $784;
       } else {
        $$lcssa311 = $782;$1057 = $783;$1058 = $784;
        break;
       }
      }
      $$0$lcssa$i92$i = $$lcssa311;$$01$lcssa$off0$i93$i = $1057;
     } else {
      $$0$lcssa$i92$i = $7;$$01$lcssa$off0$i93$i = $772;
     }
     $790 = ($$01$lcssa$off0$i93$i|0)==(0);
     if ($790) {
      $estr$1$ph$i = $$0$lcssa$i92$i;
     } else {
      $$12$i95$i = $$0$lcssa$i92$i;$y$03$i94$i = $$01$lcssa$off0$i93$i;
      while(1) {
       $791 = (($y$03$i94$i>>>0) % 10)&-1;
       $792 = $791 | 48;
       $793 = $792&255;
       $794 = (($$12$i95$i) + -1|0);
       HEAP8[$794>>0] = $793;
       $795 = (($y$03$i94$i>>>0) / 10)&-1;
       $796 = ($y$03$i94$i>>>0)<(10);
       if ($796) {
        $estr$1$ph$i = $794;
        break;
       } else {
        $$12$i95$i = $794;$y$03$i94$i = $795;
       }
      }
     }
     $797 = $estr$1$ph$i;
     $798 = (($9) - ($797))|0;
     $799 = ($798|0)<(2);
     if ($799) {
      $estr$1209$i = $estr$1$ph$i;
      while(1) {
       $800 = (($estr$1209$i) + -1|0);
       HEAP8[$800>>0] = 48;
       $801 = $800;
       $802 = (($9) - ($801))|0;
       $803 = ($802|0)<(2);
       if ($803) {
        $estr$1209$i = $800;
       } else {
        $estr$1$lcssa$i = $800;
        break;
       }
      }
     } else {
      $estr$1$lcssa$i = $estr$1$ph$i;
     }
     $804 = $e$4$ph$i >> 31;
     $805 = $804 & 2;
     $806 = (($805) + 43)|0;
     $807 = $806&255;
     $808 = (($estr$1$lcssa$i) + -1|0);
     HEAP8[$808>>0] = $807;
     $809 = $$120$i&255;
     $810 = (($estr$1$lcssa$i) + -2|0);
     HEAP8[$810>>0] = $809;
     $811 = $810;
     $812 = (($9) - ($811))|0;
     $$pn$i = $812;$estr$2$i = $810;
    }
    $813 = (($pl$0$i) + 1)|0;
    $814 = (($813) + ($$317$i))|0;
    $l$1$i = (($814) + ($765))|0;
    $815 = (($l$1$i) + ($$pn$i))|0;
    $816 = $fl$1$ & 73728;
    $817 = ($816|0)==(0);
    $818 = ($w$1|0)>($815|0);
    $or$cond$i101$i = $817 & $818;
    if ($or$cond$i101$i) {
     $819 = (($w$1) - ($815))|0;
     $820 = ($819>>>0)>(256);
     $821 = $820 ? 256 : $819;
     _memset(($pad$i|0),32,($821|0))|0;
     $822 = ($819>>>0)>(255);
     if ($822) {
      $$01$i103$i = $819;
      while(1) {
       (___fwritex($pad$i,256,$f)|0);
       $823 = (($$01$i103$i) + -256)|0;
       $824 = ($823>>>0)>(255);
       if ($824) {
        $$01$i103$i = $823;
       } else {
        break;
       }
      }
      $825 = $819 & 255;
      $$0$lcssa$i105$i = $825;
     } else {
      $$0$lcssa$i105$i = $819;
     }
     (___fwritex($pad$i,$$0$lcssa$i105$i,$f)|0);
    }
    (___fwritex($prefix$0$i,$pl$0$i,$f)|0);
    $826 = ($816|0)==(65536);
    $or$cond$i108$i = $826 & $818;
    if ($or$cond$i108$i) {
     $827 = (($w$1) - ($815))|0;
     $828 = ($827>>>0)>(256);
     $829 = $828 ? 256 : $827;
     _memset(($pad$i|0),48,($829|0))|0;
     $830 = ($827>>>0)>(255);
     if ($830) {
      $$01$i110$i = $827;
      while(1) {
       (___fwritex($pad$i,256,$f)|0);
       $831 = (($$01$i110$i) + -256)|0;
       $832 = ($831>>>0)>(255);
       if ($832) {
        $$01$i110$i = $831;
       } else {
        break;
       }
      }
      $833 = $827 & 255;
      $$0$lcssa$i112$i = $833;
     } else {
      $$0$lcssa$i112$i = $827;
     }
     (___fwritex($pad$i,$$0$lcssa$i112$i,$f)|0);
    }
    do {
     if ($768) {
      $834 = ($a$8$ph$i>>>0)>($$39$i>>>0);
      $r$0$a$8$i = $834 ? $$39$i : $a$8$ph$i;
      $835 = $558 ^ -1;
      $836 = $a$8$ph294$i ^ -1;
      $837 = ($835>>>0)>($836>>>0);
      $umax$i = $837 ? $835 : $836;
      $838 = (3 - ($umax$i))|0;
      $uglygep$i = (($$39$i) + 1|0);
      $uglygep296$i = $uglygep$i;
      $839 = ($838>>>0)>($uglygep296$i>>>0);
      $umax297$i = $839 ? $838 : $uglygep296$i;
      $umax297298299$i = $umax297$i;
      $uglygep300$i = (($umax297298299$i) + ($umax$i)|0);
      $uglygep300301$i = $uglygep300$i;
      $840 = $umax$i ^ -1;
      $d$4199$i = $r$0$a$8$i;
      while(1) {
       $841 = HEAP32[$d$4199$i>>2]|0;
       $842 = ($841|0)==(0);
       if ($842) {
        $$1$lcssa$i120$i = $14;
       } else {
        $$12$i118$i = $14;$y$03$i117$i = $841;
        while(1) {
         $843 = (($y$03$i117$i>>>0) % 10)&-1;
         $844 = $843 | 48;
         $845 = $844&255;
         $846 = (($$12$i118$i) + -1|0);
         HEAP8[$846>>0] = $845;
         $847 = (($y$03$i117$i>>>0) / 10)&-1;
         $848 = ($y$03$i117$i>>>0)<(10);
         if ($848) {
          $$1$lcssa$i120$i = $846;
          break;
         } else {
          $$12$i118$i = $846;$y$03$i117$i = $847;
         }
        }
       }
       $849 = ($d$4199$i|0)==($r$0$a$8$i|0);
       do {
        if ($849) {
         $853 = ($$1$lcssa$i120$i|0)==($14|0);
         if (!($853)) {
          $s7$1$i = $$1$lcssa$i120$i;
          break;
         }
         HEAP8[$16>>0] = 48;
         $s7$1$i = $16;
        } else {
         $850 = ($$1$lcssa$i120$i>>>0)>($buf$i>>>0);
         if ($850) {
          $s7$0196$i = $$1$lcssa$i120$i;
         } else {
          $s7$1$i = $$1$lcssa$i120$i;
          break;
         }
         while(1) {
          $851 = (($s7$0196$i) + -1|0);
          HEAP8[$851>>0] = 48;
          $852 = ($851>>>0)>($buf$i>>>0);
          if ($852) {
           $s7$0196$i = $851;
          } else {
           $s7$1$i = $851;
           break;
          }
         }
        }
       } while(0);
       $854 = $s7$1$i;
       $855 = (($15) - ($854))|0;
       (___fwritex($s7$1$i,$855,$f)|0);
       $856 = (($d$4199$i) + 4|0);
       $857 = ($856>>>0)>($$39$i>>>0);
       if ($857) {
        $$lcssa320 = $856;
        break;
       } else {
        $d$4199$i = $856;
       }
      }
      $858 = $uglygep300301$i & -4;
      $859 = (($858) + ($840))|0;
      $860 = $859;
      $$not$i = $762 ^ 1;
      $861 = $fl$1$ & 8;
      $862 = ($861|0)==(0);
      $or$cond35$i = $862 & $$not$i;
      if (!($or$cond35$i)) {
       (___fwritex(2608,1,$f)|0);
      }
      $863 = ($$lcssa320>>>0)<($z$6$i$lcssa>>>0);
      $864 = ($$317$i|0)>(0);
      $or$cond10191$i = $863 & $864;
      if ($or$cond10191$i) {
       $$418193$i = $$317$i;$879 = $860;$d$5192$i = $$lcssa320;
       while(1) {
        $865 = HEAP32[$d$5192$i>>2]|0;
        $866 = ($865|0)==(0);
        if ($866) {
         $s8$0188$i = $14;
         label = 300;
        } else {
         $$12$i127$i = $14;$y$03$i126$i = $865;
         while(1) {
          $867 = (($y$03$i126$i>>>0) % 10)&-1;
          $868 = $867 | 48;
          $869 = $868&255;
          $870 = (($$12$i127$i) + -1|0);
          HEAP8[$870>>0] = $869;
          $871 = (($y$03$i126$i>>>0) / 10)&-1;
          $872 = ($y$03$i126$i>>>0)<(10);
          if ($872) {
           $$lcssa321 = $870;
           break;
          } else {
           $$12$i127$i = $870;$y$03$i126$i = $871;
          }
         }
         $873 = ($$lcssa321>>>0)>($buf$i>>>0);
         if ($873) {
          $s8$0188$i = $$lcssa321;
          label = 300;
         } else {
          $s8$0$lcssa$i = $$lcssa321;
         }
        }
        if ((label|0) == 300) {
         while(1) {
          label = 0;
          $874 = (($s8$0188$i) + -1|0);
          HEAP8[$874>>0] = 48;
          $875 = ($874>>>0)>($buf$i>>>0);
          if ($875) {
           $s8$0188$i = $874;
           label = 300;
          } else {
           $s8$0$lcssa$i = $874;
           break;
          }
         }
        }
        $876 = ($$418193$i|0)>(9);
        $877 = $876 ? 9 : $$418193$i;
        (___fwritex($s8$0$lcssa$i,$877,$f)|0);
        $878 = (($879) + 8|0);
        $880 = (($$418193$i) + -9)|0;
        $881 = ($878>>>0)<($z$6$i$lcssa>>>0);
        $882 = ($880|0)>(0);
        $or$cond10$i = $881 & $882;
        if ($or$cond10$i) {
         $879$phi = $d$5192$i;$$418193$i = $880;$d$5192$i = $878;$879 = $879$phi;
        } else {
         $$418$lcssa$i = $880;
         break;
        }
       }
      } else {
       $$418$lcssa$i = $$317$i;
      }
      $883 = ($$418$lcssa$i|0)>(0);
      if (!($883)) {
       break;
      }
      $884 = ($$418$lcssa$i>>>0)>(256);
      $885 = $884 ? 256 : $$418$lcssa$i;
      _memset(($pad$i|0),48,($885|0))|0;
      $886 = ($$418$lcssa$i>>>0)>(255);
      if ($886) {
       $$01$i134$i = $$418$lcssa$i;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $887 = (($$01$i134$i) + -256)|0;
        $888 = ($887>>>0)>(255);
        if ($888) {
         $$01$i134$i = $887;
        } else {
         break;
        }
       }
       $889 = $$418$lcssa$i & 255;
       $$0$lcssa$i136$i = $889;
      } else {
       $$0$lcssa$i136$i = $$418$lcssa$i;
      }
      (___fwritex($pad$i,$$0$lcssa$i136$i,$f)|0);
     } else {
      $890 = (($a$8$ph$i) + 4|0);
      $z$6$$i = $$lcssa283$i ? $z$6$i$lcssa : $890;
      $891 = ($$317$i|0)>(-1);
      do {
       if ($891) {
        $892 = $fl$1$ & 8;
        $893 = ($892|0)==(0);
        $$5205$i = $$317$i;$d$6204$i = $a$8$ph$i;
        while(1) {
         $894 = HEAP32[$d$6204$i>>2]|0;
         $895 = ($894|0)==(0);
         if ($895) {
          label = 312;
         } else {
          $$12$i142$i = $14;$y$03$i141$i = $894;
          while(1) {
           $896 = (($y$03$i141$i>>>0) % 10)&-1;
           $897 = $896 | 48;
           $898 = $897&255;
           $899 = (($$12$i142$i) + -1|0);
           HEAP8[$899>>0] = $898;
           $900 = (($y$03$i141$i>>>0) / 10)&-1;
           $901 = ($y$03$i141$i>>>0)<(10);
           if ($901) {
            $$12$i142$i$lcssa = $$12$i142$i;$$lcssa315 = $899;
            break;
           } else {
            $$12$i142$i = $899;$y$03$i141$i = $900;
           }
          }
          $902 = ($$lcssa315|0)==($14|0);
          if ($902) {
           label = 312;
          } else {
           $1059 = $$12$i142$i$lcssa;$s9$0$i = $$lcssa315;
          }
         }
         if ((label|0) == 312) {
          label = 0;
          HEAP8[$16>>0] = 48;
          $1059 = $14;$s9$0$i = $16;
         }
         $903 = ($d$6204$i|0)==($a$8$ph$i|0);
         do {
          if ($903) {
           (___fwritex($s9$0$i,1,$f)|0);
           $907 = ($$5205$i|0)<(1);
           $or$cond37$i = $907 & $893;
           if ($or$cond37$i) {
            $s9$2$i = $1059;
            break;
           }
           (___fwritex(2608,1,$f)|0);
           $s9$2$i = $1059;
          } else {
           $904 = ($s9$0$i>>>0)>($buf$i>>>0);
           if ($904) {
            $s9$1200$i = $s9$0$i;
           } else {
            $s9$2$i = $s9$0$i;
            break;
           }
           while(1) {
            $905 = (($s9$1200$i) + -1|0);
            HEAP8[$905>>0] = 48;
            $906 = ($905>>>0)>($buf$i>>>0);
            if ($906) {
             $s9$1200$i = $905;
            } else {
             $s9$2$i = $905;
             break;
            }
           }
          }
         } while(0);
         $908 = $s9$2$i;
         $909 = (($15) - ($908))|0;
         $910 = ($$5205$i|0)>($909|0);
         $$$5$i = $910 ? $909 : $$5205$i;
         (___fwritex($s9$2$i,$$$5$i,$f)|0);
         $911 = (($$5205$i) - ($909))|0;
         $912 = (($d$6204$i) + 4|0);
         $913 = ($912>>>0)<($z$6$$i>>>0);
         $914 = ($911|0)>(-1);
         $or$cond12$i = $913 & $914;
         if ($or$cond12$i) {
          $$5205$i = $911;$d$6204$i = $912;
         } else {
          $$lcssa317 = $911;
          break;
         }
        }
        $915 = ($$lcssa317|0)>(0);
        if (!($915)) {
         break;
        }
        $916 = ($$lcssa317>>>0)>(256);
        $917 = $916 ? 256 : $$lcssa317;
        _memset(($pad$i|0),48,($917|0))|0;
        $918 = ($$lcssa317>>>0)>(255);
        if ($918) {
         $$01$i149$i = $$lcssa317;
         while(1) {
          (___fwritex($pad$i,256,$f)|0);
          $919 = (($$01$i149$i) + -256)|0;
          $920 = ($919>>>0)>(255);
          if ($920) {
           $$01$i149$i = $919;
          } else {
           break;
          }
         }
         $921 = $$lcssa317 & 255;
         $$0$lcssa$i151$i = $921;
        } else {
         $$0$lcssa$i151$i = $$lcssa317;
        }
        (___fwritex($pad$i,$$0$lcssa$i151$i,$f)|0);
       }
      } while(0);
      $922 = $estr$2$i;
      $923 = (($9) - ($922))|0;
      (___fwritex($estr$2$i,$923,$f)|0);
     }
    } while(0);
    $924 = ($816|0)==(8192);
    $or$cond$i$i = $924 & $818;
    if ($or$cond$i$i) {
     $925 = (($w$1) - ($815))|0;
     $926 = ($925>>>0)>(256);
     $927 = $926 ? 256 : $925;
     _memset(($pad$i|0),32,($927|0))|0;
     $928 = ($925>>>0)>(255);
     if ($928) {
      $$01$i$i = $925;
      while(1) {
       (___fwritex($pad$i,256,$f)|0);
       $929 = (($$01$i$i) + -256)|0;
       $930 = ($929>>>0)>(255);
       if ($930) {
        $$01$i$i = $929;
       } else {
        break;
       }
      }
      $931 = $925 & 255;
      $$0$lcssa$i$i = $931;
     } else {
      $$0$lcssa$i$i = $925;
     }
     (___fwritex($pad$i,$$0$lcssa$i$i,$f)|0);
    }
    $w$38$i = $818 ? $w$1 : $815;
    $1039 = $191;$1040 = $218;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $w$38$i;$l10n$0 = $l10n$3;
    continue L1;
    break;
   }
   default: {
    $1047 = $191;$1048 = $218;$a$2 = $fmt90;$fl$6 = $fl$1$;$p$5 = $p$0;$pl$2 = 0;$prefix$2 = 2512;$z$2 = $2;
   }
   }
  } while(0);
  do {
   if ((label|0) == 74) {
    label = 0;
    $215 = $t$1 & 32;
    $216 = ($191|0)==(0);
    $217 = ($218|0)==(0);
    $219 = $216 & $217;
    if ($219) {
     $293 = $191;$295 = $218;$a$0 = $2;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 2512;
     label = 90;
    } else {
     $$012$i = $2;$221 = $191;$228 = $218;
     while(1) {
      $220 = $221 & 15;
      $222 = (2592 + ($220)|0);
      $223 = HEAP8[$222>>0]|0;
      $224 = $223&255;
      $225 = $224 | $215;
      $226 = $225&255;
      $227 = (($$012$i) + -1|0);
      HEAP8[$227>>0] = $226;
      $229 = (_bitshift64Lshr(($221|0),($228|0),4)|0);
      $230 = tempRet0;
      $231 = ($229|0)==(0);
      $232 = ($230|0)==(0);
      $233 = $231 & $232;
      if ($233) {
       $$lcssa332 = $227;
       break;
      } else {
       $$012$i = $227;$221 = $229;$228 = $230;
      }
     }
     $234 = $fl$3 & 8;
     $235 = ($234|0)==(0);
     if ($235) {
      $293 = $191;$295 = $218;$a$0 = $$lcssa332;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 2512;
      label = 90;
     } else {
      $236 = $t$1 >> 4;
      $237 = (2512 + ($236)|0);
      $293 = $191;$295 = $218;$a$0 = $$lcssa332;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 2;$prefix$1 = $237;
      label = 90;
     }
    }
   }
   else if ((label|0) == 85) {
    label = 0;
    $262 = ($263>>>0)>(0);
    $264 = ($265>>>0)>(4294967295);
    $266 = ($263|0)==(0);
    $267 = $266 & $264;
    $268 = $262 | $267;
    if ($268) {
     $$05$i = $2;$269 = $265;$270 = $263;
     while(1) {
      $271 = (___uremdi3(($269|0),($270|0),10,0)|0);
      $272 = tempRet0;
      $273 = $271 | 48;
      $274 = $273&255;
      $275 = (($$05$i) + -1|0);
      HEAP8[$275>>0] = $274;
      $276 = (___udivdi3(($269|0),($270|0),10,0)|0);
      $277 = tempRet0;
      $278 = ($270>>>0)>(9);
      $279 = ($269>>>0)>(4294967295);
      $280 = ($270|0)==(9);
      $281 = $280 & $279;
      $282 = $278 | $281;
      if ($282) {
       $$05$i = $275;$269 = $276;$270 = $277;
      } else {
       $$lcssa328 = $275;$1049 = $276;$1050 = $277;
       break;
      }
     }
     $$0$lcssa$i54 = $$lcssa328;$$01$lcssa$off0$i = $1049;
    } else {
     $$0$lcssa$i54 = $2;$$01$lcssa$off0$i = $265;
    }
    $283 = ($$01$lcssa$off0$i|0)==(0);
    if ($283) {
     $293 = $265;$295 = $263;$a$0 = $$0$lcssa$i54;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $pl$0;$prefix$1 = $prefix$0;
     label = 90;
    } else {
     $$12$i = $$0$lcssa$i54;$y$03$i = $$01$lcssa$off0$i;
     while(1) {
      $284 = (($y$03$i>>>0) % 10)&-1;
      $285 = $284 | 48;
      $286 = $285&255;
      $287 = (($$12$i) + -1|0);
      HEAP8[$287>>0] = $286;
      $288 = (($y$03$i>>>0) / 10)&-1;
      $289 = ($y$03$i>>>0)<(10);
      if ($289) {
       $293 = $265;$295 = $263;$a$0 = $287;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $pl$0;$prefix$1 = $prefix$0;
       label = 90;
       break;
      } else {
       $$12$i = $287;$y$03$i = $288;
      }
     }
    }
   }
   else if ((label|0) == 95) {
    label = 0;
    $310 = (_memchr($a$1,0,$p$0)|0);
    $311 = ($310|0)==(0|0);
    if ($311) {
     $312 = (($a$1) + ($p$0)|0);
     $1047 = $191;$1048 = $218;$a$2 = $a$1;$fl$6 = $189;$p$5 = $p$0;$pl$2 = 0;$prefix$2 = 2512;$z$2 = $312;
     break;
    } else {
     $313 = $310;
     $314 = $a$1;
     $315 = (($313) - ($314))|0;
     $1047 = $191;$1048 = $218;$a$2 = $a$1;$fl$6 = $189;$p$5 = $315;$pl$2 = 0;$prefix$2 = 2512;$z$2 = $310;
     break;
    }
   }
   else if ((label|0) == 100) {
    label = 0;
    $i$0180 = 0;$l$1179 = 0;$ws$0181 = $1051;
    while(1) {
     $318 = HEAP32[$ws$0181>>2]|0;
     $319 = ($318|0)==(0);
     if ($319) {
      $i$0$lcssa = $i$0180;$l$2 = $l$1179;
      break;
     }
     $320 = (_wctomb($mb,$318)|0);
     $321 = ($320|0)<(0);
     $322 = (($p$4274) - ($i$0180))|0;
     $323 = ($320>>>0)>($322>>>0);
     $or$cond23 = $321 | $323;
     if ($or$cond23) {
      $i$0$lcssa = $i$0180;$l$2 = $320;
      break;
     }
     $324 = (($ws$0181) + 4|0);
     $325 = (($320) + ($i$0180))|0;
     $326 = ($p$4274>>>0)>($325>>>0);
     if ($326) {
      $i$0180 = $325;$l$1179 = $320;$ws$0181 = $324;
     } else {
      $i$0$lcssa = $325;$l$2 = $320;
      break;
     }
    }
    $327 = ($l$2|0)<(0);
    if ($327) {
     $$0 = -1;
     label = 369;
     break L1;
    } else {
     $1053 = $1052;$1054 = $1051;$i$0$lcssa275 = $i$0$lcssa;
     label = 105;
    }
   }
  } while(0);
  if ((label|0) == 90) {
   label = 0;
   $290 = ($p$2|0)>(-1);
   $291 = $fl$4 & -65537;
   $$fl$4 = $290 ? $291 : $fl$4;
   $292 = ($293|0)!=(0);
   $294 = ($295|0)!=(0);
   $296 = $292 | $294;
   $297 = ($p$2|0)!=(0);
   $or$cond = $296 | $297;
   if ($or$cond) {
    $298 = $a$0;
    $299 = (($3) - ($298))|0;
    $300 = $296&1;
    $301 = $300 ^ 1;
    $302 = (($301) + ($299))|0;
    $303 = ($p$2|0)>($302|0);
    $p$2$ = $303 ? $p$2 : $302;
    $1047 = $293;$1048 = $295;$a$2 = $a$0;$fl$6 = $$fl$4;$p$5 = $p$2$;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $2;
   } else {
    $1047 = $293;$1048 = $295;$a$2 = $2;$fl$6 = $$fl$4;$p$5 = 0;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $2;
   }
  }
  else if ((label|0) == 105) {
   label = 0;
   $328 = $fl$1$ & 73728;
   $329 = ($328|0)==(0);
   $330 = ($w$1|0)>($i$0$lcssa275|0);
   $or$cond$i65 = $329 & $330;
   if ($or$cond$i65) {
    $331 = (($w$1) - ($i$0$lcssa275))|0;
    $332 = ($331>>>0)>(256);
    $333 = $332 ? 256 : $331;
    _memset(($pad$i|0),32,($333|0))|0;
    $334 = ($331>>>0)>(255);
    if ($334) {
     $$01$i67 = $331;
     while(1) {
      (___fwritex($pad$i,256,$f)|0);
      $335 = (($$01$i67) + -256)|0;
      $336 = ($335>>>0)>(255);
      if ($336) {
       $$01$i67 = $335;
      } else {
       break;
      }
     }
     $337 = $331 & 255;
     $$0$lcssa$i69 = $337;
    } else {
     $$0$lcssa$i69 = $331;
    }
    (___fwritex($pad$i,$$0$lcssa$i69,$f)|0);
   }
   $338 = ($i$0$lcssa275|0)==(0);
   L478: do {
    if (!($338)) {
     $i$1191 = 0;$ws$1192 = $1054;
     while(1) {
      $339 = HEAP32[$ws$1192>>2]|0;
      $340 = ($339|0)==(0);
      if ($340) {
       break L478;
      }
      $341 = (_wctomb($mb,$339)|0);
      $342 = (($341) + ($i$1191))|0;
      $343 = ($342|0)>($i$0$lcssa275|0);
      if ($343) {
       break L478;
      }
      $344 = (($ws$1192) + 4|0);
      (___fwritex($mb,$341,$f)|0);
      $345 = ($342>>>0)<($i$0$lcssa275>>>0);
      if ($345) {
       $i$1191 = $342;$ws$1192 = $344;
      } else {
       break;
      }
     }
    }
   } while(0);
   $346 = ($328|0)==(8192);
   $or$cond$i72 = $346 & $330;
   if ($or$cond$i72) {
    $347 = (($w$1) - ($i$0$lcssa275))|0;
    $348 = ($347>>>0)>(256);
    $349 = $348 ? 256 : $347;
    _memset(($pad$i|0),32,($349|0))|0;
    $350 = ($347>>>0)>(255);
    if ($350) {
     $$01$i74 = $347;
     while(1) {
      (___fwritex($pad$i,256,$f)|0);
      $351 = (($$01$i74) + -256)|0;
      $352 = ($351>>>0)>(255);
      if ($352) {
       $$01$i74 = $351;
      } else {
       break;
      }
     }
     $353 = $347 & 255;
     $$0$lcssa$i76 = $353;
    } else {
     $$0$lcssa$i76 = $347;
    }
    (___fwritex($pad$i,$$0$lcssa$i76,$f)|0);
   }
   $354 = $330 ? $w$1 : $i$0$lcssa275;
   $1039 = $1053;$1040 = $218;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $354;$l10n$0 = $l10n$3;
   continue;
  }
  $932 = $z$2;
  $933 = $a$2;
  $934 = (($932) - ($933))|0;
  $935 = ($p$5|0)<($934|0);
  $$p$5 = $935 ? $934 : $p$5;
  $936 = (($pl$2) + ($$p$5))|0;
  $937 = ($w$1|0)<($936|0);
  $w$2 = $937 ? $936 : $w$1;
  $938 = $fl$6 & 73728;
  $939 = ($938|0)==(0);
  $940 = ($w$2|0)>($936|0);
  $or$cond$i82 = $939 & $940;
  if ($or$cond$i82) {
   $941 = (($w$2) - ($936))|0;
   $942 = ($941>>>0)>(256);
   $943 = $942 ? 256 : $941;
   _memset(($pad$i|0),32,($943|0))|0;
   $944 = ($941>>>0)>(255);
   if ($944) {
    $$01$i84 = $941;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $945 = (($$01$i84) + -256)|0;
     $946 = ($945>>>0)>(255);
     if ($946) {
      $$01$i84 = $945;
     } else {
      break;
     }
    }
    $947 = $941 & 255;
    $$0$lcssa$i86 = $947;
   } else {
    $$0$lcssa$i86 = $941;
   }
   (___fwritex($pad$i,$$0$lcssa$i86,$f)|0);
  }
  (___fwritex($prefix$2,$pl$2,$f)|0);
  $948 = ($938|0)==(65536);
  $or$cond$i58 = $948 & $940;
  if ($or$cond$i58) {
   $949 = (($w$2) - ($936))|0;
   $950 = ($949>>>0)>(256);
   $951 = $950 ? 256 : $949;
   _memset(($pad$i|0),48,($951|0))|0;
   $952 = ($949>>>0)>(255);
   if ($952) {
    $$01$i60 = $949;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $953 = (($$01$i60) + -256)|0;
     $954 = ($953>>>0)>(255);
     if ($954) {
      $$01$i60 = $953;
     } else {
      break;
     }
    }
    $955 = $949 & 255;
    $$0$lcssa$i62 = $955;
   } else {
    $$0$lcssa$i62 = $949;
   }
   (___fwritex($pad$i,$$0$lcssa$i62,$f)|0);
  }
  $956 = ($$p$5|0)>($934|0);
  if ($956) {
   $957 = (($$p$5) - ($934))|0;
   $958 = ($957>>>0)>(256);
   $959 = $958 ? 256 : $957;
   _memset(($pad$i|0),48,($959|0))|0;
   $960 = ($957>>>0)>(255);
   if ($960) {
    $$01$i45 = $957;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $961 = (($$01$i45) + -256)|0;
     $962 = ($961>>>0)>(255);
     if ($962) {
      $$01$i45 = $961;
     } else {
      break;
     }
    }
    $963 = $957 & 255;
    $$0$lcssa$i47 = $963;
   } else {
    $$0$lcssa$i47 = $957;
   }
   (___fwritex($pad$i,$$0$lcssa$i47,$f)|0);
  }
  (___fwritex($a$2,$934,$f)|0);
  $964 = ($938|0)==(8192);
  $or$cond$i = $964 & $940;
  if (!($or$cond$i)) {
   $1039 = $1047;$1040 = $1048;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $w$2;$l10n$0 = $l10n$3;
   continue;
  }
  $965 = (($w$2) - ($936))|0;
  $966 = ($965>>>0)>(256);
  $967 = $966 ? 256 : $965;
  _memset(($pad$i|0),32,($967|0))|0;
  $968 = ($965>>>0)>(255);
  if ($968) {
   $$01$i = $965;
   while(1) {
    (___fwritex($pad$i,256,$f)|0);
    $969 = (($$01$i) + -256)|0;
    $970 = ($969>>>0)>(255);
    if ($970) {
     $$01$i = $969;
    } else {
     break;
    }
   }
   $971 = $965 & 255;
   $$0$lcssa$i = $971;
  } else {
   $$0$lcssa$i = $965;
  }
  (___fwritex($pad$i,$$0$lcssa$i,$f)|0);
  $1039 = $1047;$1040 = $1048;$cnt$0 = $cnt$1;$fmt90 = $$lcssa298;$l$0 = $w$2;$l10n$0 = $l10n$3;
 }
 if ((label|0) == 351) {
  $972 = ($f|0)==(0|0);
  if (!($972)) {
   $$0 = $cnt$1$lcssa;
   STACKTOP = sp;return ($$0|0);
  }
  $973 = ($l10n$0$lcssa|0)==(0);
  if ($973) {
   $$0 = 0;
   STACKTOP = sp;return ($$0|0);
  } else {
   $i$2166 = 1;
  }
  while(1) {
   $974 = (($nl_type) + ($i$2166<<2)|0);
   $975 = HEAP32[$974>>2]|0;
   $976 = ($975|0)==(0);
   if ($976) {
    $i$3164 = $i$2166;
    break;
   }
   $977 = (($nl_arg) + ($i$2166<<3)|0);
   $978 = ($975>>>0)>(20);
   L533: do {
    if (!($978)) {
     do {
      switch ($975|0) {
      case 9:  {
       $arglist_current35 = HEAP32[$ap>>2]|0;
       $979 = HEAP32[$arglist_current35>>2]|0;
       $arglist_next36 = (($arglist_current35) + 4|0);
       HEAP32[$ap>>2] = $arglist_next36;
       HEAP32[$977>>2] = $979;
       break L533;
       break;
      }
      case 10:  {
       $arglist_current38 = HEAP32[$ap>>2]|0;
       $980 = HEAP32[$arglist_current38>>2]|0;
       $arglist_next39 = (($arglist_current38) + 4|0);
       HEAP32[$ap>>2] = $arglist_next39;
       $981 = ($980|0)<(0);
       $982 = $981 << 31 >> 31;
       $983 = $977;
       $984 = $983;
       HEAP32[$984>>2] = $980;
       $985 = (($983) + 4)|0;
       $986 = $985;
       HEAP32[$986>>2] = $982;
       break L533;
       break;
      }
      case 11:  {
       $arglist_current41 = HEAP32[$ap>>2]|0;
       $987 = HEAP32[$arglist_current41>>2]|0;
       $arglist_next42 = (($arglist_current41) + 4|0);
       HEAP32[$ap>>2] = $arglist_next42;
       $988 = $977;
       $989 = $988;
       HEAP32[$989>>2] = $987;
       $990 = (($988) + 4)|0;
       $991 = $990;
       HEAP32[$991>>2] = 0;
       break L533;
       break;
      }
      case 12:  {
       $arglist_current44 = HEAP32[$ap>>2]|0;
       $992 = $arglist_current44;
       $993 = $992;
       $994 = HEAP32[$993>>2]|0;
       $995 = (($992) + 4)|0;
       $996 = $995;
       $997 = HEAP32[$996>>2]|0;
       $arglist_next45 = (($arglist_current44) + 8|0);
       HEAP32[$ap>>2] = $arglist_next45;
       $998 = $977;
       $999 = $998;
       HEAP32[$999>>2] = $994;
       $1000 = (($998) + 4)|0;
       $1001 = $1000;
       HEAP32[$1001>>2] = $997;
       break L533;
       break;
      }
      case 13:  {
       $arglist_current47 = HEAP32[$ap>>2]|0;
       $1002 = HEAP32[$arglist_current47>>2]|0;
       $arglist_next48 = (($arglist_current47) + 4|0);
       HEAP32[$ap>>2] = $arglist_next48;
       $1003 = $1002&65535;
       $1004 = $1003 << 16 >> 16;
       $1005 = ($1004|0)<(0);
       $1006 = $1005 << 31 >> 31;
       $1007 = $977;
       $1008 = $1007;
       HEAP32[$1008>>2] = $1004;
       $1009 = (($1007) + 4)|0;
       $1010 = $1009;
       HEAP32[$1010>>2] = $1006;
       break L533;
       break;
      }
      case 14:  {
       $arglist_current50 = HEAP32[$ap>>2]|0;
       $1011 = HEAP32[$arglist_current50>>2]|0;
       $arglist_next51 = (($arglist_current50) + 4|0);
       HEAP32[$ap>>2] = $arglist_next51;
       $$mask1$i = $1011 & 65535;
       $1012 = $977;
       $1013 = $1012;
       HEAP32[$1013>>2] = $$mask1$i;
       $1014 = (($1012) + 4)|0;
       $1015 = $1014;
       HEAP32[$1015>>2] = 0;
       break L533;
       break;
      }
      case 15:  {
       $arglist_current53 = HEAP32[$ap>>2]|0;
       $1016 = HEAP32[$arglist_current53>>2]|0;
       $arglist_next54 = (($arglist_current53) + 4|0);
       HEAP32[$ap>>2] = $arglist_next54;
       $1017 = $1016&255;
       $1018 = $1017 << 24 >> 24;
       $1019 = ($1018|0)<(0);
       $1020 = $1019 << 31 >> 31;
       $1021 = $977;
       $1022 = $1021;
       HEAP32[$1022>>2] = $1018;
       $1023 = (($1021) + 4)|0;
       $1024 = $1023;
       HEAP32[$1024>>2] = $1020;
       break L533;
       break;
      }
      case 16:  {
       $arglist_current56 = HEAP32[$ap>>2]|0;
       $1025 = HEAP32[$arglist_current56>>2]|0;
       $arglist_next57 = (($arglist_current56) + 4|0);
       HEAP32[$ap>>2] = $arglist_next57;
       $$mask$i = $1025 & 255;
       $1026 = $977;
       $1027 = $1026;
       HEAP32[$1027>>2] = $$mask$i;
       $1028 = (($1026) + 4)|0;
       $1029 = $1028;
       HEAP32[$1029>>2] = 0;
       break L533;
       break;
      }
      case 17:  {
       $arglist_current59 = HEAP32[$ap>>2]|0;
       HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current59>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current59+4>>2];$1030 = +HEAPF64[tempDoublePtr>>3];
       $arglist_next60 = (($arglist_current59) + 8|0);
       HEAP32[$ap>>2] = $arglist_next60;
       HEAPF64[$977>>3] = $1030;
       break L533;
       break;
      }
      case 18:  {
       $arglist_current62 = HEAP32[$ap>>2]|0;
       HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current62>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current62+4>>2];$1031 = +HEAPF64[tempDoublePtr>>3];
       $arglist_next63 = (($arglist_current62) + 8|0);
       HEAP32[$ap>>2] = $arglist_next63;
       HEAPF64[$977>>3] = $1031;
       break L533;
       break;
      }
      default: {
       break L533;
      }
      }
     } while(0);
    }
   } while(0);
   $1032 = (($i$2166) + 1)|0;
   $1033 = ($1032|0)<(10);
   if ($1033) {
    $i$2166 = $1032;
   } else {
    $$0 = 1;
    label = 369;
    break;
   }
  }
  if ((label|0) == 369) {
   STACKTOP = sp;return ($$0|0);
  }
  while(1) {
   $1036 = (($nl_type) + ($i$3164<<2)|0);
   $1037 = HEAP32[$1036>>2]|0;
   $1038 = ($1037|0)==(0);
   $1035 = (($i$3164) + 1)|0;
   if (!($1038)) {
    $$0 = -1;
    label = 369;
    break;
   }
   $1034 = ($1035|0)<(10);
   if ($1034) {
    $i$3164 = $1035;
   } else {
    $$0 = 1;
    label = 369;
    break;
   }
  }
  if ((label|0) == 369) {
   STACKTOP = sp;return ($$0|0);
  }
 }
 else if ((label|0) == 369) {
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function _sn_write($f,$s,$l) {
 $f = $f|0;
 $s = $s|0;
 $l = $l|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (($f) + 20|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = $1;
 $5 = $3;
 $6 = (($4) - ($5))|0;
 $7 = ($6>>>0)>($l>>>0);
 $l$ = $7 ? $l : $6;
 _memcpy(($3|0),($s|0),($l$|0))|0;
 $8 = HEAP32[$2>>2]|0;
 $9 = (($8) + ($l$)|0);
 HEAP32[$2>>2] = $9;
 STACKTOP = sp;return ($l|0);
}
function runPostSets() {
 
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function _strlen(ptr) {
    ptr = ptr|0;
    var curr = 0;
    curr = ptr;
    while (((HEAP8[((curr)>>0)])|0)) {
      curr = (curr + 1)|0;
    }
    return (curr - ptr)|0;
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _memcpy(dest, src, num) {

    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _llvm_bswap_i32(x) {
    x = x|0;
    return (((x&0xff)<<24) | (((x>>8)&0xff)<<16) | (((x>>16)&0xff)<<8) | (x>>>24))|0;
}
function _bitshift64Ashr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = (high|0) < 0 ? -1 : 0;
    return (high >> (bits - 32))|0;
  }
function _llvm_ctlz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((ctlz_i8)+(x >>> 24))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((ctlz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((ctlz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((ctlz_i8)+(x&0xff))>>0)])|0) + 24)|0;
  }

function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
  }

// ======== compiled code from system/lib/compiler-rt , see readme therein
function ___muldsi3($a, $b) {
  $a = $a | 0;
  $b = $b | 0;
  var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
  $1 = $a & 65535;
  $2 = $b & 65535;
  $3 = Math_imul($2, $1) | 0;
  $6 = $a >>> 16;
  $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
  $11 = $b >>> 16;
  $12 = Math_imul($11, $1) | 0;
  return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___divdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $7$0 = 0, $7$1 = 0, $8$0 = 0, $10$0 = 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  $7$0 = $2$0 ^ $1$0;
  $7$1 = $2$1 ^ $1$1;
  $8$0 = ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, 0) | 0;
  $10$0 = _i64Subtract($8$0 ^ $7$0, tempRet0 ^ $7$1, $7$0, $7$1) | 0;
  return (tempRet0 = tempRet0, $10$0) | 0;
}
function ___remdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  $rem = __stackBase__ | 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, $rem) | 0;
  $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0, HEAP32[$rem + 4 >> 2] ^ $1$1, $1$0, $1$1) | 0;
  $10$1 = tempRet0;
  STACKTOP = __stackBase__;
  return (tempRet0 = $10$1, $10$0) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
  $x_sroa_0_0_extract_trunc = $a$0;
  $y_sroa_0_0_extract_trunc = $b$0;
  $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
  $1$1 = tempRet0;
  $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
  return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0;
  $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
  return (tempRet0 = tempRet0, $1$0) | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  $rem = __stackBase__ | 0;
  ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
  STACKTOP = __stackBase__;
  return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  $rem = $rem | 0;
  var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
  $n_sroa_0_0_extract_trunc = $a$0;
  $n_sroa_1_4_extract_shift$0 = $a$1;
  $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
  $d_sroa_0_0_extract_trunc = $b$0;
  $d_sroa_1_4_extract_shift$0 = $b$1;
  $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
  if (($n_sroa_1_4_extract_trunc | 0) == 0) {
    $4 = ($rem | 0) != 0;
    if (($d_sroa_1_4_extract_trunc | 0) == 0) {
      if ($4) {
        HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
        HEAP32[$rem + 4 >> 2] = 0;
      }
      $_0$1 = 0;
      $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$4) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    }
  }
  $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
  do {
    if (($d_sroa_0_0_extract_trunc | 0) == 0) {
      if ($17) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      if (($n_sroa_0_0_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0;
          HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
      if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
        }
        $_0$1 = 0;
        $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $49 = _llvm_ctlz_i32($d_sroa_1_4_extract_trunc | 0) | 0;
      $51 = $49 - (_llvm_ctlz_i32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
      if ($51 >>> 0 <= 30) {
        $57 = $51 + 1 | 0;
        $58 = 31 - $51 | 0;
        $sr_1_ph = $57;
        $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
        $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
        $q_sroa_0_1_ph = 0;
        $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
        break;
      }
      if (($rem | 0) == 0) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = 0 | $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$17) {
        $117 = _llvm_ctlz_i32($d_sroa_1_4_extract_trunc | 0) | 0;
        $119 = $117 - (_llvm_ctlz_i32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($119 >>> 0 <= 31) {
          $125 = $119 + 1 | 0;
          $126 = 31 - $119 | 0;
          $130 = $119 - 31 >> 31;
          $sr_1_ph = $125;
          $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
      if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
        $86 = (_llvm_ctlz_i32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
        $88 = $86 - (_llvm_ctlz_i32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        $89 = 64 - $88 | 0;
        $91 = 32 - $88 | 0;
        $92 = $91 >> 31;
        $95 = $88 - 32 | 0;
        $105 = $95 >> 31;
        $sr_1_ph = $88;
        $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
        $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
        $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
        $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
        break;
      }
      if (($rem | 0) != 0) {
        HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
        HEAP32[$rem + 4 >> 2] = 0;
      }
      if (($d_sroa_0_0_extract_trunc | 0) == 1) {
        $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$0 = 0 | $a$0 & -1;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
        $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
        $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
  } while (0);
  if (($sr_1_ph | 0) == 0) {
    $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
    $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
    $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
    $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = 0;
  } else {
    $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
    $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
    $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0, $d_sroa_0_0_insert_insert99$1, -1, -1) | 0;
    $137$1 = tempRet0;
    $q_sroa_1_1198 = $q_sroa_1_1_ph;
    $q_sroa_0_1199 = $q_sroa_0_1_ph;
    $r_sroa_1_1200 = $r_sroa_1_1_ph;
    $r_sroa_0_1201 = $r_sroa_0_1_ph;
    $sr_1202 = $sr_1_ph;
    $carry_0203 = 0;
    while (1) {
      $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
      $149 = $carry_0203 | $q_sroa_0_1199 << 1;
      $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
      $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
      _i64Subtract($137$0, $137$1, $r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1) | 0;
      $150$1 = tempRet0;
      $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
      $152 = $151$0 & 1;
      $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1, $151$0 & $d_sroa_0_0_insert_insert99$0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1) | 0;
      $r_sroa_0_0_extract_trunc = $154$0;
      $r_sroa_1_4_extract_trunc = tempRet0;
      $155 = $sr_1202 - 1 | 0;
      if (($155 | 0) == 0) {
        break;
      } else {
        $q_sroa_1_1198 = $147;
        $q_sroa_0_1199 = $149;
        $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
        $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
        $sr_1202 = $155;
        $carry_0203 = $152;
      }
    }
    $q_sroa_1_1_lcssa = $147;
    $q_sroa_0_1_lcssa = $149;
    $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
    $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = $152;
  }
  $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
  $q_sroa_0_0_insert_ext75$1 = 0;
  $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
  if (($rem | 0) != 0) {
    HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
    HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
  }
  $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
  $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
}
// =======================================================================



// EMSCRIPTEN_END_FUNCS

  
  function dynCall_iiii(index,a1,a2,a3) {
    index = index|0;
    a1=a1|0; a2=a2|0; a3=a3|0;
    return FUNCTION_TABLE_iiii[index&1](a1|0,a2|0,a3|0)|0;
  }


  function dynCall_iii(index,a1,a2) {
    index = index|0;
    a1=a1|0; a2=a2|0;
    return FUNCTION_TABLE_iii[index&1](a1|0,a2|0)|0;
  }

function b0(p0,p1,p2) { p0 = p0|0;p1 = p1|0;p2 = p2|0; abort(0);return 0; }
  function b1(p0,p1) { p0 = p0|0;p1 = p1|0; abort(1);return 0; }
  // EMSCRIPTEN_END_FUNCS
  var FUNCTION_TABLE_iiii = [b0,_sn_write];
  var FUNCTION_TABLE_iii = [b1,_compareOffsets];

  return { _i64Subtract: _i64Subtract, _free: _free, _main: _main, _i64Add: _i64Add, _strlen: _strlen, _memset: _memset, _malloc: _malloc, _memcpy: _memcpy, _bitshift64Lshr: _bitshift64Lshr, _llvm_bswap_i32: _llvm_bswap_i32, _bitshift64Shl: _bitshift64Shl, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_iiii: dynCall_iiii, dynCall_iii: dynCall_iii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _free = Module["_free"] = asm["_free"];
var _main = Module["_main"] = asm["_main"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _llvm_bswap_i32 = Module["_llvm_bswap_i32"] = asm["_llvm_bswap_i32"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];


// TODO: strip out parts of this we do not need

//======= begin closure i64 code =======

// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 *
 */

var i64Math = (function() { // Emscripten wrapper
  var goog = { math: {} };


  /**
   * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
   * values as *signed* integers.  See the from* functions below for more
   * convenient ways of constructing Longs.
   *
   * The internal representation of a long is the two given signed, 32-bit values.
   * We use 32-bit pieces because these are the size of integers on which
   * Javascript performs bit-operations.  For operations like addition and
   * multiplication, we split each number into 16-bit pieces, which can easily be
   * multiplied within Javascript's floating-point representation without overflow
   * or change in sign.
   *
   * In the algorithms below, we frequently reduce the negative case to the
   * positive case by negating the input(s) and then post-processing the result.
   * Note that we must ALWAYS check specially whether those values are MIN_VALUE
   * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
   * a positive number, it overflows back into a negative).  Not handling this
   * case would often result in infinite recursion.
   *
   * @param {number} low  The low (signed) 32 bits of the long.
   * @param {number} high  The high (signed) 32 bits of the long.
   * @constructor
   */
  goog.math.Long = function(low, high) {
    /**
     * @type {number}
     * @private
     */
    this.low_ = low | 0;  // force into 32 signed bits.

    /**
     * @type {number}
     * @private
     */
    this.high_ = high | 0;  // force into 32 signed bits.
  };


  // NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
  // from* methods on which they depend.


  /**
   * A cache of the Long representations of small integer values.
   * @type {!Object}
   * @private
   */
  goog.math.Long.IntCache_ = {};


  /**
   * Returns a Long representing the given (32-bit) integer value.
   * @param {number} value The 32-bit integer in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromInt = function(value) {
    if (-128 <= value && value < 128) {
      var cachedObj = goog.math.Long.IntCache_[value];
      if (cachedObj) {
        return cachedObj;
      }
    }

    var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
    if (-128 <= value && value < 128) {
      goog.math.Long.IntCache_[value] = obj;
    }
    return obj;
  };


  /**
   * Returns a Long representing the given value, provided that it is a finite
   * number.  Otherwise, zero is returned.
   * @param {number} value The number in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) {
      return goog.math.Long.ZERO;
    } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MIN_VALUE;
    } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MAX_VALUE;
    } else if (value < 0) {
      return goog.math.Long.fromNumber(-value).negate();
    } else {
      return new goog.math.Long(
          (value % goog.math.Long.TWO_PWR_32_DBL_) | 0,
          (value / goog.math.Long.TWO_PWR_32_DBL_) | 0);
    }
  };


  /**
   * Returns a Long representing the 64-bit integer that comes by concatenating
   * the given high and low bits.  Each is assumed to use 32 bits.
   * @param {number} lowBits The low 32-bits.
   * @param {number} highBits The high 32-bits.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
  };


  /**
   * Returns a Long representation of the given string, written using the given
   * radix.
   * @param {string} str The textual representation of the Long.
   * @param {number=} opt_radix The radix in which the text is written.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromString = function(str, opt_radix) {
    if (str.length == 0) {
      throw Error('number format error: empty string');
    }

    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (str.charAt(0) == '-') {
      return goog.math.Long.fromString(str.substring(1), radix).negate();
    } else if (str.indexOf('-') >= 0) {
      throw Error('number format error: interior "-" character: ' + str);
    }

    // Do several (8) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));

    var result = goog.math.Long.ZERO;
    for (var i = 0; i < str.length; i += 8) {
      var size = Math.min(8, str.length - i);
      var value = parseInt(str.substring(i, i + size), radix);
      if (size < 8) {
        var power = goog.math.Long.fromNumber(Math.pow(radix, size));
        result = result.multiply(power).add(goog.math.Long.fromNumber(value));
      } else {
        result = result.multiply(radixToPower);
        result = result.add(goog.math.Long.fromNumber(value));
      }
    }
    return result;
  };


  // NOTE: the compiler should inline these constant values below and then remove
  // these variables, so there should be no runtime penalty for these.


  /**
   * Number used repeated below in calculations.  This must appear before the
   * first call to any from* function below.
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_32_DBL_ =
      goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_31_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ / 2;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_48_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_64_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_63_DBL_ =
      goog.math.Long.TWO_PWR_64_DBL_ / 2;


  /** @type {!goog.math.Long} */
  goog.math.Long.ZERO = goog.math.Long.fromInt(0);


  /** @type {!goog.math.Long} */
  goog.math.Long.ONE = goog.math.Long.fromInt(1);


  /** @type {!goog.math.Long} */
  goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);


  /** @type {!goog.math.Long} */
  goog.math.Long.MAX_VALUE =
      goog.math.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);


  /** @type {!goog.math.Long} */
  goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 0x80000000 | 0);


  /**
   * @type {!goog.math.Long}
   * @private
   */
  goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);


  /** @return {number} The value, assuming it is a 32-bit integer. */
  goog.math.Long.prototype.toInt = function() {
    return this.low_;
  };


  /** @return {number} The closest floating-point representation to this value. */
  goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ +
           this.getLowBitsUnsigned();
  };


  /**
   * @param {number=} opt_radix The radix in which the text should be written.
   * @return {string} The textual representation of this value.
   */
  goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (this.isZero()) {
      return '0';
    }

    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        // We need to change the Long value before it can be negated, so we remove
        // the bottom-most digit in this base and then recurse to do the rest.
        var radixLong = goog.math.Long.fromNumber(radix);
        var div = this.div(radixLong);
        var rem = div.multiply(radixLong).subtract(this);
        return div.toString(radix) + rem.toInt().toString(radix);
      } else {
        return '-' + this.negate().toString(radix);
      }
    }

    // Do several (6) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));

    var rem = this;
    var result = '';
    while (true) {
      var remDiv = rem.div(radixToPower);
      var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
      var digits = intval.toString(radix);

      rem = remDiv;
      if (rem.isZero()) {
        return digits + result;
      } else {
        while (digits.length < 6) {
          digits = '0' + digits;
        }
        result = '' + digits + result;
      }
    }
  };


  /** @return {number} The high 32-bits as a signed value. */
  goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
  };


  /** @return {number} The low 32-bits as a signed value. */
  goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
  };


  /** @return {number} The low 32-bits as an unsigned value. */
  goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return (this.low_ >= 0) ?
        this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
  };


  /**
   * @return {number} Returns the number of bits needed to represent the absolute
   *     value of this Long.
   */
  goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        return 64;
      } else {
        return this.negate().getNumBitsAbs();
      }
    } else {
      var val = this.high_ != 0 ? this.high_ : this.low_;
      for (var bit = 31; bit > 0; bit--) {
        if ((val & (1 << bit)) != 0) {
          break;
        }
      }
      return this.high_ != 0 ? bit + 33 : bit + 1;
    }
  };


  /** @return {boolean} Whether this value is zero. */
  goog.math.Long.prototype.isZero = function() {
    return this.high_ == 0 && this.low_ == 0;
  };


  /** @return {boolean} Whether this value is negative. */
  goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
  };


  /** @return {boolean} Whether this value is odd. */
  goog.math.Long.prototype.isOdd = function() {
    return (this.low_ & 1) == 1;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long equals the other.
   */
  goog.math.Long.prototype.equals = function(other) {
    return (this.high_ == other.high_) && (this.low_ == other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long does not equal the other.
   */
  goog.math.Long.prototype.notEquals = function(other) {
    return (this.high_ != other.high_) || (this.low_ != other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than the other.
   */
  goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than or equal to the other.
   */
  goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than the other.
   */
  goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than or equal to the other.
   */
  goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
  };


  /**
   * Compares this Long with the given one.
   * @param {goog.math.Long} other Long to compare against.
   * @return {number} 0 if they are the same, 1 if the this is greater, and -1
   *     if the given one is greater.
   */
  goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) {
      return 0;
    }

    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) {
      return -1;
    }
    if (!thisNeg && otherNeg) {
      return 1;
    }

    // at this point, the signs are the same, so subtraction will not overflow
    if (this.subtract(other).isNegative()) {
      return -1;
    } else {
      return 1;
    }
  };


  /** @return {!goog.math.Long} The negation of this value. */
  goog.math.Long.prototype.negate = function() {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.MIN_VALUE;
    } else {
      return this.not().add(goog.math.Long.ONE);
    }
  };


  /**
   * Returns the sum of this and the given Long.
   * @param {goog.math.Long} other Long to add to this one.
   * @return {!goog.math.Long} The sum of this and the given Long.
   */
  goog.math.Long.prototype.add = function(other) {
    // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns the difference of this and the given Long.
   * @param {goog.math.Long} other Long to subtract from this.
   * @return {!goog.math.Long} The difference of this and the given Long.
   */
  goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
  };


  /**
   * Returns the product of this and the given long.
   * @param {goog.math.Long} other Long to multiply with this.
   * @return {!goog.math.Long} The product of this and the other.
   */
  goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) {
      return goog.math.Long.ZERO;
    } else if (other.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().multiply(other.negate());
      } else {
        return this.negate().multiply(other).negate();
      }
    } else if (other.isNegative()) {
      return this.multiply(other.negate()).negate();
    }

    // If both longs are small, use float multiplication
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) &&
        other.lessThan(goog.math.Long.TWO_PWR_24_)) {
      return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    }

    // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
    // We can skip products that would overflow.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns this Long divided by the given one.
   * @param {goog.math.Long} other Long by which to divide.
   * @return {!goog.math.Long} This Long divided by the given one.
   */
  goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) {
      throw Error('division by zero');
    } else if (this.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      if (other.equals(goog.math.Long.ONE) ||
          other.equals(goog.math.Long.NEG_ONE)) {
        return goog.math.Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
      } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ONE;
      } else {
        // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
        var halfThis = this.shiftRight(1);
        var approx = halfThis.div(other).shiftLeft(1);
        if (approx.equals(goog.math.Long.ZERO)) {
          return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
        } else {
          var rem = this.subtract(other.multiply(approx));
          var result = approx.add(rem.div(other));
          return result;
        }
      }
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().div(other.negate());
      } else {
        return this.negate().div(other).negate();
      }
    } else if (other.isNegative()) {
      return this.div(other.negate()).negate();
    }

    // Repeat the following until the remainder is less than other:  find a
    // floating-point that approximates remainder / other *from below*, add this
    // into the result, and subtract it from the remainder.  It is critical that
    // the approximate value is less than or equal to the real value so that the
    // remainder never becomes negative.
    var res = goog.math.Long.ZERO;
    var rem = this;
    while (rem.greaterThanOrEqual(other)) {
      // Approximate the result of division. This may be a little greater or
      // smaller than the actual value.
      var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

      // We will tweak the approximate result by changing it in the 48-th digit or
      // the smallest non-fractional digit, whichever is larger.
      var log2 = Math.ceil(Math.log(approx) / Math.LN2);
      var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

      // Decrease the approximation until it is smaller than the remainder.  Note
      // that if it is too large, the product overflows and is negative.
      var approxRes = goog.math.Long.fromNumber(approx);
      var approxRem = approxRes.multiply(other);
      while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
        approx -= delta;
        approxRes = goog.math.Long.fromNumber(approx);
        approxRem = approxRes.multiply(other);
      }

      // We know the answer can't be zero... and actually, zero would cause
      // infinite recursion since we would make no progress.
      if (approxRes.isZero()) {
        approxRes = goog.math.Long.ONE;
      }

      res = res.add(approxRes);
      rem = rem.subtract(approxRem);
    }
    return res;
  };


  /**
   * Returns this Long modulo the given one.
   * @param {goog.math.Long} other Long by which to mod.
   * @return {!goog.math.Long} This Long modulo the given one.
   */
  goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
  };


  /** @return {!goog.math.Long} The bitwise-NOT of this value. */
  goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
  };


  /**
   * Returns the bitwise-AND of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to AND.
   * @return {!goog.math.Long} The bitwise-AND of this and the other.
   */
  goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_,
                                   this.high_ & other.high_);
  };


  /**
   * Returns the bitwise-OR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to OR.
   * @return {!goog.math.Long} The bitwise-OR of this and the other.
   */
  goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_,
                                   this.high_ | other.high_);
  };


  /**
   * Returns the bitwise-XOR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to XOR.
   * @return {!goog.math.Long} The bitwise-XOR of this and the other.
   */
  goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_,
                                   this.high_ ^ other.high_);
  };


  /**
   * Returns this Long with bits shifted to the left by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the left by the given amount.
   */
  goog.math.Long.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var low = this.low_;
      if (numBits < 32) {
        var high = this.high_;
        return goog.math.Long.fromBits(
            low << numBits,
            (high << numBits) | (low >>> (32 - numBits)));
      } else {
        return goog.math.Long.fromBits(0, low << (numBits - 32));
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount.
   */
  goog.math.Long.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >> numBits);
      } else {
        return goog.math.Long.fromBits(
            high >> (numBits - 32),
            high >= 0 ? 0 : -1);
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount, with
   * the new top bits matching the current sign bit.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount, with
   *     zeros placed into the new leading bits.
   */
  goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >>> numBits);
      } else if (numBits == 32) {
        return goog.math.Long.fromBits(high, 0);
      } else {
        return goog.math.Long.fromBits(high >>> (numBits - 32), 0);
      }
    }
  };

  //======= begin jsbn =======

  var navigator = { appName: 'Modern Browser' }; // polyfill a little

  // Copyright (c) 2005  Tom Wu
  // All Rights Reserved.
  // http://www-cs-students.stanford.edu/~tjw/jsbn/

  /*
   * Copyright (c) 2003-2005  Tom Wu
   * All Rights Reserved.
   *
   * Permission is hereby granted, free of charge, to any person obtaining
   * a copy of this software and associated documentation files (the
   * "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish,
   * distribute, sublicense, and/or sell copies of the Software, and to
   * permit persons to whom the Software is furnished to do so, subject to
   * the following conditions:
   *
   * The above copyright notice and this permission notice shall be
   * included in all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
   * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
   * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
   *
   * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
   * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
   * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
   * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
   * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * In addition, the following condition applies:
   *
   * All redistributions must retain an intact copy of this copyright notice
   * and disclaimer.
   */

  // Basic JavaScript BN library - subset useful for RSA encryption.

  // Bits per digit
  var dbits;

  // JavaScript engine analysis
  var canary = 0xdeadbeefcafe;
  var j_lm = ((canary&0xffffff)==0xefcafe);

  // (public) Constructor
  function BigInteger(a,b,c) {
    if(a != null)
      if("number" == typeof a) this.fromNumber(a,b,c);
      else if(b == null && "string" != typeof a) this.fromString(a,256);
      else this.fromString(a,b);
  }

  // return new, unset BigInteger
  function nbi() { return new BigInteger(null); }

  // am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
  // We need to select the fastest one that works in this environment.

  // am1: use a single mult and divide to get the high bits,
  // max digit bits should be 26 because
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
  function am1(i,x,w,j,c,n) {
    while(--n >= 0) {
      var v = x*this[i++]+w[j]+c;
      c = Math.floor(v/0x4000000);
      w[j++] = v&0x3ffffff;
    }
    return c;
  }
  // am2 avoids a big mult-and-extract completely.
  // Max digit bits should be <= 30 because we do bitwise ops
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
  function am2(i,x,w,j,c,n) {
    var xl = x&0x7fff, xh = x>>15;
    while(--n >= 0) {
      var l = this[i]&0x7fff;
      var h = this[i++]>>15;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
      c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
      w[j++] = l&0x3fffffff;
    }
    return c;
  }
  // Alternately, set max digit bits to 28 since some
  // browsers slow down when dealing with 32-bit numbers.
  function am3(i,x,w,j,c,n) {
    var xl = x&0x3fff, xh = x>>14;
    while(--n >= 0) {
      var l = this[i]&0x3fff;
      var h = this[i++]>>14;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x3fff)<<14)+w[j]+c;
      c = (l>>28)+(m>>14)+xh*h;
      w[j++] = l&0xfffffff;
    }
    return c;
  }
  if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30;
  }
  else if(j_lm && (navigator.appName != "Netscape")) {
    BigInteger.prototype.am = am1;
    dbits = 26;
  }
  else { // Mozilla/Netscape seems to prefer am3
    BigInteger.prototype.am = am3;
    dbits = 28;
  }

  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = ((1<<dbits)-1);
  BigInteger.prototype.DV = (1<<dbits);

  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2,BI_FP);
  BigInteger.prototype.F1 = BI_FP-dbits;
  BigInteger.prototype.F2 = 2*dbits-BI_FP;

  // Digit conversions
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr,vv;
  rr = "0".charCodeAt(0);
  for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = "a".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = "A".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

  function int2char(n) { return BI_RM.charAt(n); }
  function intAt(s,i) {
    var c = BI_RC[s.charCodeAt(i)];
    return (c==null)?-1:c;
  }

  // (protected) copy this to r
  function bnpCopyTo(r) {
    for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
    r.t = this.t;
    r.s = this.s;
  }

  // (protected) set from integer value x, -DV <= x < DV
  function bnpFromInt(x) {
    this.t = 1;
    this.s = (x<0)?-1:0;
    if(x > 0) this[0] = x;
    else if(x < -1) this[0] = x+DV;
    else this.t = 0;
  }

  // return bigint initialized to value
  function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

  // (protected) set from string and radix
  function bnpFromString(s,b) {
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 256) k = 8; // byte array
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else { this.fromRadix(s,b); return; }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while(--i >= 0) {
      var x = (k==8)?s[i]&0xff:intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if(sh == 0)
        this[this.t++] = x;
      else if(sh+k > this.DB) {
        this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
        this[this.t++] = (x>>(this.DB-sh));
      }
      else
        this[this.t-1] |= x<<sh;
      sh += k;
      if(sh >= this.DB) sh -= this.DB;
    }
    if(k == 8 && (s[0]&0x80) != 0) {
      this.s = -1;
      if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
    }
    this.clamp();
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) clamp off excess high words
  function bnpClamp() {
    var c = this.s&this.DM;
    while(this.t > 0 && this[this.t-1] == c) --this.t;
  }

  // (public) return string representation in given radix
  function bnToString(b) {
    if(this.s < 0) return "-"+this.negate().toString(b);
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1<<k)-1, d, m = false, r = "", i = this.t;
    var p = this.DB-(i*this.DB)%k;
    if(i-- > 0) {
      if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
      while(i >= 0) {
        if(p < k) {
          d = (this[i]&((1<<p)-1))<<(k-p);
          d |= this[--i]>>(p+=this.DB-k);
        }
        else {
          d = (this[i]>>(p-=k))&km;
          if(p <= 0) { p += this.DB; --i; }
        }
        if(d > 0) m = true;
        if(m) r += int2char(d);
      }
    }
    return m?r:"0";
  }

  // (public) -this
  function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

  // (public) |this|
  function bnAbs() { return (this.s<0)?this.negate():this; }

  // (public) return + if this > a, - if this < a, 0 if equal
  function bnCompareTo(a) {
    var r = this.s-a.s;
    if(r != 0) return r;
    var i = this.t;
    r = i-a.t;
    if(r != 0) return (this.s<0)?-r:r;
    while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
    return 0;
  }

  // returns bit length of the integer x
  function nbits(x) {
    var r = 1, t;
    if((t=x>>>16) != 0) { x = t; r += 16; }
    if((t=x>>8) != 0) { x = t; r += 8; }
    if((t=x>>4) != 0) { x = t; r += 4; }
    if((t=x>>2) != 0) { x = t; r += 2; }
    if((t=x>>1) != 0) { x = t; r += 1; }
    return r;
  }

  // (public) return the number of bits in "this"
  function bnBitLength() {
    if(this.t <= 0) return 0;
    return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
  }

  // (protected) r = this << n*DB
  function bnpDLShiftTo(n,r) {
    var i;
    for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
    for(i = n-1; i >= 0; --i) r[i] = 0;
    r.t = this.t+n;
    r.s = this.s;
  }

  // (protected) r = this >> n*DB
  function bnpDRShiftTo(n,r) {
    for(var i = n; i < this.t; ++i) r[i-n] = this[i];
    r.t = Math.max(this.t-n,0);
    r.s = this.s;
  }

  // (protected) r = this << n
  function bnpLShiftTo(n,r) {
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<cbs)-1;
    var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
    for(i = this.t-1; i >= 0; --i) {
      r[i+ds+1] = (this[i]>>cbs)|c;
      c = (this[i]&bm)<<bs;
    }
    for(i = ds-1; i >= 0; --i) r[i] = 0;
    r[ds] = c;
    r.t = this.t+ds+1;
    r.s = this.s;
    r.clamp();
  }

  // (protected) r = this >> n
  function bnpRShiftTo(n,r) {
    r.s = this.s;
    var ds = Math.floor(n/this.DB);
    if(ds >= this.t) { r.t = 0; return; }
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<bs)-1;
    r[0] = this[ds]>>bs;
    for(var i = ds+1; i < this.t; ++i) {
      r[i-ds-1] |= (this[i]&bm)<<cbs;
      r[i-ds] = this[i]>>bs;
    }
    if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
    r.t = this.t-ds;
    r.clamp();
  }

  // (protected) r = this - a
  function bnpSubTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]-a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c -= a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c -= a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c -= a.s;
    }
    r.s = (c<0)?-1:0;
    if(c < -1) r[i++] = this.DV+c;
    else if(c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
  }

  // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.
  function bnpMultiplyTo(a,r) {
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i+y.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
    r.s = 0;
    r.clamp();
    if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
  }

  // (protected) r = this^2, r != this (HAC 14.16)
  function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2*x.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < x.t-1; ++i) {
      var c = x.am(i,x[i],r,2*i,0,1);
      if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
        r[i+x.t] -= x.DV;
        r[i+x.t+1] = 1;
      }
    }
    if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
    r.s = 0;
    r.clamp();
  }

  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.
  function bnpDivRemTo(m,q,r) {
    var pm = m.abs();
    if(pm.t <= 0) return;
    var pt = this.abs();
    if(pt.t < pm.t) {
      if(q != null) q.fromInt(0);
      if(r != null) this.copyTo(r);
      return;
    }
    if(r == null) r = nbi();
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
    if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
    else { pm.copyTo(y); pt.copyTo(r); }
    var ys = y.t;
    var y0 = y[ys-1];
    if(y0 == 0) return;
    var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
    var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
    var i = r.t, j = i-ys, t = (q==null)?nbi():q;
    y.dlShiftTo(j,t);
    if(r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t,r);
    }
    BigInteger.ONE.dlShiftTo(ys,t);
    t.subTo(y,y);	// "negative" y so we can replace sub with am later
    while(y.t < ys) y[y.t++] = 0;
    while(--j >= 0) {
      // Estimate quotient digit
      var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
      if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
        y.dlShiftTo(j,t);
        r.subTo(t,r);
        while(r[i] < --qd) r.subTo(t,r);
      }
    }
    if(q != null) {
      r.drShiftTo(ys,q);
      if(ts != ms) BigInteger.ZERO.subTo(q,q);
    }
    r.t = ys;
    r.clamp();
    if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
    if(ts < 0) BigInteger.ZERO.subTo(r,r);
  }

  // (public) this mod a
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a,null,r);
    if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
    return r;
  }

  // Modular reduction using "classic" algorithm
  function Classic(m) { this.m = m; }
  function cConvert(x) {
    if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) { return x; }
  function cReduce(x) { x.divRemTo(this.m,null,x); }
  function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
  function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;

  // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  // justification:
  //         xy == 1 (mod m)
  //         xy =  1+km
  //   xy(2-xy) = (1+km)(1-km)
  // x[y(2-xy)] = 1-k^2m^2
  // x[y(2-xy)] == 1 (mod m^2)
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
  // JS multiply "overflows" differently from C/C++, so care is needed here.
  function bnpInvDigit() {
    if(this.t < 1) return 0;
    var x = this[0];
    if((x&1) == 0) return 0;
    var y = x&3;		// y == 1/x mod 2^2
    y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
    y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
    y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
    y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV
    return (y>0)?this.DV-y:-y;
  }

  // Montgomery reduction
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp&0x7fff;
    this.mph = this.mp>>15;
    this.um = (1<<(m.DB-15))-1;
    this.mt2 = 2*m.t;
  }

  // xR mod m
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t,r);
    r.divRemTo(this.m,null,r);
    if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
    return r;
  }

  // x/R mod m
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }

  // x = x/R mod m (HAC 14.32)
  function montReduce(x) {
    while(x.t <= this.mt2)	// pad x so am has enough room later
      x[x.t++] = 0;
    for(var i = 0; i < this.m.t; ++i) {
      // faster way of calculating u0 = x[i]*mp mod DV
      var j = x[i]&0x7fff;
      var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
      // use am to combine the multiply-shift-add into one call
      j = i+this.m.t;
      x[j] += this.m.am(0,u0,x,i,0,this.m.t);
      // propagate carry
      while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
    }
    x.clamp();
    x.drShiftTo(this.m.t,x);
    if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
  }

  // r = "x^2/R mod m"; x != r
  function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  // r = "xy/R mod m"; x,y != r
  function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;

  // (protected) true iff this is even
  function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

  // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
  function bnpExp(e,z) {
    if(e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
    g.copyTo(r);
    while(--i >= 0) {
      z.sqrTo(r,r2);
      if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
      else { var t = r; r = r2; r2 = t; }
    }
    return z.revert(r);
  }

  // (public) this^e % m, 0 <= e < 2^32
  function bnModPowInt(e,m) {
    var z;
    if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
    return this.exp(e,z);
  }

  // protected
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;

  // public
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;

  // "constants"
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);

  // jsbn2 stuff

  // (protected) convert from radix string
  function bnpFromRadix(s,b) {
    this.fromInt(0);
    if(b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
    for(var i = 0; i < s.length; ++i) {
      var x = intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w = b*w+x;
      if(++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w,0);
        j = 0;
        w = 0;
      }
    }
    if(j > 0) {
      this.dMultiply(Math.pow(b,j));
      this.dAddOffset(w,0);
    }
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) return x s.t. r^x < DV
  function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

  // (public) 0 if this == 0, 1 if this > 0
  function bnSigNum() {
    if(this.s < 0) return -1;
    else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
    else return 1;
  }

  // (protected) this *= n, this >= 0, 1 < n < DV
  function bnpDMultiply(n) {
    this[this.t] = this.am(0,n-1,this,0,0,this.t);
    ++this.t;
    this.clamp();
  }

  // (protected) this += n << w words, this >= 0
  function bnpDAddOffset(n,w) {
    if(n == 0) return;
    while(this.t <= w) this[this.t++] = 0;
    this[w] += n;
    while(this[w] >= this.DV) {
      this[w] -= this.DV;
      if(++w >= this.t) this[this.t++] = 0;
      ++this[w];
    }
  }

  // (protected) convert to radix string
  function bnpToRadix(b) {
    if(b == null) b = 10;
    if(this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b,cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d,y,z);
    while(y.signum() > 0) {
      r = (a+z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d,y,z);
    }
    return z.intValue().toString(b) + r;
  }

  // (public) return value as integer
  function bnIntValue() {
    if(this.s < 0) {
      if(this.t == 1) return this[0]-this.DV;
      else if(this.t == 0) return -1;
    }
    else if(this.t == 1) return this[0];
    else if(this.t == 0) return 0;
    // assumes 16 < DB < 32
    return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
  }

  // (protected) r = this + a
  function bnpAddTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]+a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c += a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c += a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += a.s;
    }
    r.s = (c<0)?-1:0;
    if(c > 0) r[i++] = c;
    else if(c < -1) r[i++] = this.DV+c;
    r.t = i;
    r.clamp();
  }

  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.addTo = bnpAddTo;

  //======= end jsbn =======

  // Emscripten wrapper
  var Wrapper = {
    abs: function(l, h) {
      var x = new goog.math.Long(l, h);
      var ret;
      if (x.isNegative()) {
        ret = x.negate();
      } else {
        ret = x;
      }
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
    },
    ensureTemps: function() {
      if (Wrapper.ensuredTemps) return;
      Wrapper.ensuredTemps = true;
      Wrapper.two32 = new BigInteger();
      Wrapper.two32.fromString('4294967296', 10);
      Wrapper.two64 = new BigInteger();
      Wrapper.two64.fromString('18446744073709551616', 10);
      Wrapper.temp1 = new BigInteger();
      Wrapper.temp2 = new BigInteger();
    },
    lh2bignum: function(l, h) {
      var a = new BigInteger();
      a.fromString(h.toString(), 10);
      var b = new BigInteger();
      a.multiplyTo(Wrapper.two32, b);
      var c = new BigInteger();
      c.fromString(l.toString(), 10);
      var d = new BigInteger();
      c.addTo(b, d);
      return d;
    },
    stringify: function(l, h, unsigned) {
      var ret = new goog.math.Long(l, h).toString();
      if (unsigned && ret[0] == '-') {
        // unsign slowly using jsbn bignums
        Wrapper.ensureTemps();
        var bignum = new BigInteger();
        bignum.fromString(ret, 10);
        ret = new BigInteger();
        Wrapper.two64.addTo(bignum, ret);
        ret = ret.toString(10);
      }
      return ret;
    },
    fromString: function(str, base, min, max, unsigned) {
      Wrapper.ensureTemps();
      var bignum = new BigInteger();
      bignum.fromString(str, base);
      var bigmin = new BigInteger();
      bigmin.fromString(min, 10);
      var bigmax = new BigInteger();
      bigmax.fromString(max, 10);
      if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
        var temp = new BigInteger();
        bignum.addTo(Wrapper.two64, temp);
        bignum = temp;
      }
      var error = false;
      if (bignum.compareTo(bigmin) < 0) {
        bignum = bigmin;
        error = true;
      } else if (bignum.compareTo(bigmax) > 0) {
        bignum = bigmax;
        error = true;
      }
      var ret = goog.math.Long.fromString(bignum.toString()); // min-max checks should have clamped this to a range goog.math.Long can handle well
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
      if (error) throw 'range error';
    }
  };
  return Wrapper;
})();

//======= end closure i64 code =======



// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, STATIC_BASE);
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      HEAPU8.set(data, STATIC_BASE);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  if (Module['noExitRuntime']) {
    return;
  }

  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';

  throw 'abort() at ' + stackTrace() + extra;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}



