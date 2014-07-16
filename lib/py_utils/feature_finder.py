#!/usr/bin/env python
# -*- coding: utf-8 -*-

import itertools
import codecs

def find_features(segments, f_dict):
    """
    Find the minimum number of feature specifications necessary to indicate a
    set of segments to the exclusion of all others.
    """
    print("Searching for a set of features matching all and only:\n" + str(segments))
    print("")

    shared_fs = find_shared_features(segments, f_dict)

    # Disable the line below to allow matching 0-value features:
    shared_fs = [feature for feature in shared_fs if feature[0] != '0']

    for fct in range(1, len(shared_fs)+1): # number of features
        combos = itertools.combinations(shared_fs, fct)
        for combo in combos:
            if list(set(seg_matches(combo, f_dict)) - set(segments)) == []:
                strcombo = [''.join(val) for val in combo]
                return ', '.join(strcombo)

    return 'No correct feature combination found.'


def find_shared_features(segments, f_dict):
    f_lists = []

    for segment in segments:
        f_list = []
        for feature in f_dict[segment]:
            f_list.append((f_dict[segment][feature], feature))
        f_lists.append(f_list)

    return set(f_lists[0]).intersection(*f_lists[1:])



def seg_matches(fvals, f_dict):
    matches = []
    for segment in f_dict:
        match = True
        for f in fvals:
            if f_dict[segment][f[1]] != f[0]:
                match = False
        if match == True:
            matches.append(segment)

    return matches





def read_features(f_file):
    file_lines = [line[:-1].split('\t') for line in f_file]

    features = file_lines.pop(0)[1:]

    f_dict = {}
    for line in file_lines:
        if line[0] != 'empty':
            seg_fs = {}
            for f, v in zip(features, line[1:]):
                seg_fs[f] = v
            f_dict[line[0]] = seg_fs

    return f_dict



def make_dict(f_file):
    f_dict = read_features(f_file)
    outdict = {}

    for seg in f_dict:
        #print seg
        fs = ''
        for feature in f_dict[seg]:
            fs += f_dict[seg][feature]+'_'+feature+','
        fs = fs[:-1]
        #print fs

        outdict[fs] = seg

    return outdict




def main():

    F_FILE = 'features_french.txt' #raw_input("Feature file: ")

    with codecs.open(F_FILE, 'rb', encoding='utf-8') as f_file:
        f_dict = read_features(f_file)
        #~ print(find_features([u'N', u'M', u'NG'], f_dict))
        #~ print('\n')
        #~ print find_features([u'N', u'L', u'R', u'NG'], f_dict)

        print find_features([u'j', u'l'], f_dict)

if __name__ == '__main__':
    main()

