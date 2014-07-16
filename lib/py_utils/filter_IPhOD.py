#!/usr/bin/env python
# -*- coding: utf-8 -*-

import pdb, traceback, sys, code

VOWELS_NO_STRESS = ['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW']
VOWELS = sum([[v+'0',v+'1',v+'2'] for v in VOWELS_NO_STRESS], [])
# print(VOWELS)

def extract_s_plurals (infile):
    words = []
    for line in infile:
        words.append(line[:-1])
    out = []
    for word in words:
        if word[-1] == 'S':
            if word[:-2] in words and word[-5:-2] not in VOWELS:
                out.append((word[:-2], word))
    return out

def extract_z_plurals (infile):
    words = []
    for line in infile:
        words.append(line[:-1])
    out = []
    for word in words:
        if word[-1] == 'Z':
            if word[:-2] in words:
                out.append((word[:-2], word))
    return out

def extract_iz_plurals (infile):
    words = []
    for line in infile:
        words.append(line[:-1])
    out = []
    for word in words:
        if word[-5:] == 'IH0 Z':
            # print(word[:-7]+'Z')
            if word[:-6] in words or word[:-7]+'Z' in words:
                # if word[:-7]+' Z' in words:
                #     print(word)
                if word[-7] in ['S','Z'] or word[-8:-6] in ['CH', 'JH', 'SH', 'ZH']: # just in case
                    out.append((word[:-5], word))
    return out




def remove_f_th_plurals(text):
    out = []
    for line in text:
        splitline = line.split('\t')
        if splitline[0][-2:] not in ['TH', ' F']:
            out.append('\t'.join(splitline))
        else:
            if len(splitline) > 2 and len(splitline[-1]) > 1:
                out.append('\t'.join(splitline))
    return out


def remove_ss_plurals(text):
    out = []
    for line in text:
        splitline = line.split('\t')
        if len(splitline) > 1:
            if splitline[1][-3:] != 'S S':
                out.append('\t'.join(splitline))
                print(splitline)
    return out


def remove_fake_plurals(text):
    out = []
    bads = []
    for line in text:
        splitline = line.split('\t')
        if len(splitline) > 1:
            if splitline[0][-2:] not in [' P', ' T', ' K', ' F', 'TH'] and splitline[1][-1] == 'S':
                bads.append(splitline[0])
                print(splitline[0])
    for line in text:
        splitline = line.split('\t')
        if len(splitline) > 1:
            if splitline[0] not in bads:
                out.append('\t'.join(splitline))
    return out


def main():

    try:
        with open('IPhOD2_Words.txt', 'U') as infile:
            with open('output.txt', 'w') as outfile:

        # with open('IPhOD2_Words.txt', 'U') as infile:
        #     pairs = extract_s_plurals(infile)
        #     with open('plurals_s.txt', 'w') as outfile:
        #         for base, derived in pairs:
                    # outfile.write(base + '\t' + derived + '\n')

        # with open('IPhOD2_Words.txt', 'U') as infile:
        #     pairs = extract_z_plurals(infile)
        #     with open('plurals_z.txt', 'w') as outfile:
        #         for base, derived in pairs:
        #             outfile.write(base + '\t' + derived + '\n')

        # with open('IPhOD2_Words.txt', 'U') as infile:
        #     pairs = extract_iz_plurals(infile)
        #     with open('plurals_iz.txt', 'w') as outfile:
        #         for base, derived in pairs:
        #             outfile.write(base + '\t' + derived + '\n')

        # with open('english_plurals_all.txt', 'rw') as infile:
        #     lines = infile.read().split('\n')
        #     lines = remove_f_th_plurals(lines)
        #     lines = remove_ss_plurals(lines)
        #     lines = remove_fake_plurals(lines)
        #     # x = 'abcdefg'
        #     # y = x[21]
        #     outfile.write('\n'.join(lines))

                ####

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
