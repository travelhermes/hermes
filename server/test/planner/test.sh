#!/bin/bash

FILES=("base_1_day.pddl" "base_m1_day.pddl" "big.pddl" "restrictive.pddl")
METRIC_CONF=("5" "4" "3")
CBP_HEURISTIC=("1" "2" "3" "4" "5" "6" "7" "8" "9" "10")
CBP_ALGORITHM=("2" "3" "4" "6" "7" "9" "10" "11" "12" "13" "14" "15" "16" "17" "18" "19" "20")
CBP_HDIFF=("0" "1" "2")

mkdir results/
mkdir results/metric-ff
mkdir results/cbp
mkdir results/lpg

#
# Metric-FF
#
for problem in "${FILES[@]}"
do
	for conf in "${METRIC_CONF[@]}"
	do
		echo "Running ${problem}_conf_${conf}.txt"
		timeout 5m ./metric-ff -o domain.pddl -f $problem -s $conf > "results/metric-ff/${problem}_conf_${conf}.txt" &
	done
	wait
done

#
# CBP
#
for problem in "${FILES[@]}"
do
	for heuristic in "${CBP_HEURISTIC[@]}"
	do
		for algorithm in "${CBP_ALGORITHM[@]}"
		do
			for hdiff in "${CBP_HDIFF[@]}"
			do
				echo "Running ${heuristic}/${algorithm}/${hdiff}/${problem}"
				mkdir -p results/cbp/${heuristic}/${algorithm}/${hdiff}
				if [[ $hdiff -eq 0 ]]; then
					timeout 5m ./cbp-roller -O -n -F "results/cbp/${heuristic}/${algorithm}/${hdiff}/${problem}" -o domain.pddl -f $problem -H $heuristic -S $algorithm > "results/cbp/${heuristic}/${algorithm}/${hdiff}/${problem}_out.txt" &
				else
					timeout 5m ./cbp-roller -O -n -F "results/cbp/${heuristic}/${algorithm}/${hdiff}/${problem}" -o domain.pddl -f $problem -H $heuristic -S $algorithm -D $hdiff > "results/cbp/${heuristic}/${algorithm}/${hdiff}/${problem}_out.txt" &
				fi

			done
			wait
		done
	done
done
 
#
# LPG
#
for problem in "${FILES[@]}"
do
	echo "Running ${problem}"
	timeout 5m ./lpg -o domain.pddl -f $problem -n 100 -cputime 300 -out "results/lpg/${problem}" > "results/metric-ff/${problem}_out.txt"
done