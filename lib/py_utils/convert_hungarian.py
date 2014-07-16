#!/usr/bin/env python
# -*- coding: utf-8 -*-

import pdb, traceback, sys, code

def convert(file):
    lines = [line[:-1].split('\t') for line in file][1:]
    outstr = ''
    for line in lines:
        outstr += line[0] + '\t' + line[0] + ' n a k\t' + str(line[3]) + '\n'
        outstr += line[0] + '\t' + line[0] + ' n e k\t' + str(1-float(line[3])) + '\n'

    #print(outstr)
    return outstr

def main():

    try:
        with open('Hungarian_ascii.txt', 'U') as infile:
            with open('hungarian_input.txt', 'w') as outfile:
                outfile.write(convert(infile))

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
