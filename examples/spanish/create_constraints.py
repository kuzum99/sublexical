with open('spanish_rules.txt') as rulesfile:
    with open('spanish_constraints.txt', 'w') as outfile:
        environments = set()
        lines = rulesfile.readlines()
        for line in lines:
            if line[10] != '1' and line[11] != '1':
                sline = line.split('\t')
                lefthand = sline[5]
                if lefthand[:2] == 'X ':
                    lefthand = 'X'+sline[5][2:]
                else:
                    lefthand = sline[5]
                # print(lefthand)
                core = sline[1]
                righthand = sline[7]
                if righthand[-2:] == ' y':
                    righthand = sline[7][:-2]+'X'
                # print(righthand)
                enviro = lefthand + core + righthand
                enviro = ' '.join([s if s != 'X' else '([^ ] )*' for s in enviro])
                # print(sline)
                # print(enviro)
                environments.add(enviro)
        print(environments)
        print(len(environments))
        # print(len([e for e in environments if len(e) < 6 if len(e) > 0]))
        constraints = [e+'$' for e in environments if len(e) > 0]
        outfile.write('\n'.join(constraints))