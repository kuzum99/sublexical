#!/usr/bin/env python
# -*- coding: utf-8 -*-

import random, sys, traceback, code

COUNT = 100


def main():

    try:
        with open('english_plurals_iz.txt', 'U') as infile:
            with open('output.txt', 'w') as outfile:
                lines = [line for line in infile]
                chosen = random.sample(lines, COUNT)
                chosen = ''.join(chosen)
                print(chosen)
                outfile.write(chosen)


    except:
        type, value, tb = sys.exc_info()
        traceback.print_exc()
        last_frame = lambda tb=tb: last_frame(tb.tb_next) if tb.tb_next else tb
        frame = last_frame().tb_frame
        ns = dict(frame.f_globals)
        ns.update(frame.f_locals)
        code.interact(local=ns)


    return 0

if __name__ == '__main__':
    main()
