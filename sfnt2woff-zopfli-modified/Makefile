FILES=blocksplitter.c cache.c deflate.c gzip_container.c hash.c katajainen.c lz77.c squeeze.c tree.c util.c zlib_container.c zopfli_lib.c woff.c

all: sfnt2woff-zopfli woff2sfnt-zopfli

sfnt2woff-zopfli: sfnt2woff.c $(FILES) Makefile
	emcc $(LDFLAGS) $(FILES) $< -o sfnt2woff.bc -s USE_ZLIB=1 -O3
	emcc sfnt2woff.bc -o sfnt2woff.js -O1 --memory-init-file 1

woff2sfnt-zopfli: woff2sfnt.c $(FILES) Makefile
	emcc $(LDFLAGS) $(FILES) $< -o woff2sfnt.bc -s USE_ZLIB=1 -O3
	emcc woff2sfnt.bc -o woff2sfnt.js -O1 --memory-init-file 1

clean:
	$(RM) -r *.o *.dSYM sfnt2woff.js woff2sfnt.js *.gch *.out
