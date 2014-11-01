#!/usr/bin/env python
# -*- coding: utf-8 -*-




def main():

    with open('clusters_with_infixes.txt', 'U') as tagalog_input:
        with open('tagalog_input.txt', 'w') as output:
            outstring = ''
            inlines = [line.split('\t')[:4] for line in [line for line in tagalog_input]]
            #print inlines
            seen = []
            for item in inlines:
                print(item)
                if item[1][0] == 'i':
                    derivative = item[1][1:]
                else:
                    derivative = item[1]
                if derivative in seen:
                    continue
                    print(derivative)
                elif item[2] == 'in':
                    seen.append(derivative)
                    if item[3] == 'CCxx':
                        base = derivative[0:2] + derivative[4:]
                    elif item[3] == 'CxxC':
                        base = derivative[0] + derivative[3:]
                    elif item[3] == 'CCCxx':
                        base = derivative[0:3] + derivative[5:]
                    outstring += base + '\t' + derivative + '\n'

            output.write(outstring[:-1])
            

   

if __name__ == '__main__':
    main()

