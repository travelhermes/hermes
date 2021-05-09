#! /bin/bash

FILES=("base_1_day.pddl" "base_m1_day.pddl" "big.pddl" "restrictive.pddl")
CBP_HEURISTIC=("1" "2" "3" "4" "5" "6" "7" "8" "9" "10")
CBP_ALGORITHM=("2" "3" "4" "6" "7" "9" "10" "11" "12" "13" "14" "15" "16" "17" "18" "19" "20")

#
# CBP
#
for problem in "${FILES[@]}"
do
	for heuristic in "${CBP_HEURISTIC[@]}"
	do
		for algorithm in "${CBP_ALGORITHM[@]}"
		do
			echo "Running ${heuristic}/${algorithm}/${hdiff}/${problem}"
			if [[ -f "results/cbp/${heuristic}/${algorithm}/0/${problem}.5" ]]; then
				LENGTH=$(cat "results/cbp/${heuristic}/${algorithm}/0/${problem}.5" | grep ";NActions")
				COST=$(cat "results/cbp/${heuristic}/${algorithm}/0/${problem}.5" | grep ";Cost")
			elif [[ -f "results/cbp/${heuristic}/${algorithm}/0/${problem}.4" ]]; then
				LENGTH=$(cat "results/cbp/${heuristic}/${algorithm}/0/${problem}.4" | grep ";NActions")
				COST=$(cat "results/cbp/${heuristic}/${algorithm}/0/${problem}.4" | grep ";Cost")
			elif [[ -f "results/cbp/${heuristic}/${algorithm}/0/${problem}.3" ]]; then
				LENGTH=$(cat "results/cbp/${heuristic}/${algorithm}/0/${problem}.3" | grep ";NActions")
				COST=$(cat "results/cbp/${heuristic}/${algorithm}/0/${problem}.3" | grep ";Cost")
			elif [[ -f "results/cbp/${heuristic}/${algorithm}/0/${problem}.2" ]]; then
				LENGTH=$(cat "results/cbp/${heuristic}/${algorithm}/0/${problem}.2" | grep ";NActions")
				COST=$(cat "results/cbp/${heuristic}/${algorithm}/0/${problem}.2" | grep ";Cost")
			elif [[ -f "results/cbp/${heuristic}/${algorithm}/0/${problem}.1" ]]; then
				LENGTH=$(cat "results/cbp/${heuristic}/${algorithm}/0/${problem}.1" | grep ";NActions")
				COST=$(cat "results/cbp/${heuristic}/${algorithm}/0/${problem}.1" | grep ";Cost")
			else
				LENGTH='-'
				COST='-'
			fi

			echo "CBP;H${heuristic} y A${algorithm};${problem};${COST};${LENGTH}"
		done
	done
done