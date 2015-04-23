#WOFFjs
WOFFjs is an implementation of the Web Open Font Format in JavaScript. It is capable of decoding and encoding WOFF fonts client side, without any assistance from servers.

##Features
- WOFF decoding and encoding client side
- Encoder powered by Zopfli for maximum compression of fonts
- Emscripten-compiled asm.js WOFF encoder
- I’m running out of things to say

##Demo
[WOFF conversion tool (aka WOFFer)](//andrewsun.com/projects/woffjs/woffer-woff-font-converter/)

##Usage
The code is a bit too messy at the moment for me to give documentation on how to use it. However, feel free to check out its code on GitHub. It should be fairly easy to adapt the web-workers based implementation into something you can use yourself.
