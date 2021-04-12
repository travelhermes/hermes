(define (domain hermes)
    (:requirements :strips :typing :equality :quantified-preconditions :conditional-effects :fluents)
    (:types place day)
    (:constants
        start - place
        end - place
        wait - place
    )
    (:predicates
        (visited ?place - place)
        (unvisited ?place - place)
        (next-day ?day1 ?day2 - day)
        (current-day ?day - day)
        (current-place ?place - place)
        (waiting ?place - place)
    )
    (:functions
        (visit-duration ?place - place)
        (opens          ?place - place ?day - day)
        (closes         ?place - place ?day - day)
        (distance       ?place1 ?place2 - place)
        (travel-time    ?place1 ?place2 - place)

        (day-start)
        (day-end)
        (current-time)
        (heuristic)
    )

    (:action start-day
        :parameters (?place - place ?day - day)
        :precondition (and 
            (current-place start)
            (current-day ?day)
            (unvisited ?place)
            
            (> (current-time) (opens ?place ?day))
            (< (+ (current-time) (visit-duration ?place)) (closes ?place ?day))
        )
        :effect (and 
            (not (current-place start))
            (current-place ?place)
            (increase (current-time) (travel-time start ?place))
            (increase (heuristic) (distance start ?place))
        )
    )

    (:action end-day
        :parameters (?place - place)
        :precondition (and 
            (current-place ?place)
        )
        :effect (and 
            (not (current-place ?place))
            (current-place end)
            (increase (current-time) (travel-time ?place end))
            (increase (heuristic) (distance ?place end))
        )
    )

    (:action change-day
        :parameters (?day1 ?day2 - day)
        :precondition (and 
            (current-day ?day1)
            (current-place end)
            (not (= ?day1 ?day2))
            (next-day ?day1 ?day2)
        )
        :effect (and
            (not (current-place end))
            (current-place start)
            (not (current-day ?day1))
            (current-day ?day2)
            (decrease (current-time) (- (current-time) (day-start)))
        )
    )

    (:action move
        :parameters (?place1 ?place2 - place ?day - day)
        :precondition (and
            ; If currently in p1 and p2 is not visited
            (current-place ?place1)
            (not (= ?place1 start))
            (not (= ?place2 start))
            (not (= ?place1 end))
            (not (= ?place2 end))
            (visited ?place1)
            (unvisited ?place2)

            ; p2 is open today
            (current-day ?day)
            (> (+ (current-time) (travel-time ?place1 ?place2)) (opens ?place2 ?day))
            (< (+ (+ (current-time) (travel-time ?place1 ?place2)) (visit-duration ?place2)) (closes ?place2 ?day))
            ; and within day limits
            (< (current-time) (day-end))
        )
        :effect (and
            ; Move from p1 to p2, increasing by travel-time
            (not (current-place ?place1))
            (current-place ?place2)
            (increase (current-time) (travel-time ?place1 ?place2))
            (increase (heuristic) (distance ?place1 ?place2))
        )
    )
    (:action visit
        :parameters (?place - place)
        :precondition (and
            ; If currently in p
            (current-place ?place)
            (unvisited ?place)
            (not (= ?place wait))
        )
        :effect (and 
            ; Mark as visited and increase current-time
            (visited ?place)
            (not (unvisited ?place))
            (increase (current-time) (visit-duration ?place))
        )
    )

    (:action start-wait
        :parameters (?place - place)
        :precondition (and 
            (current-place ?place)
            (not (= ?place end))
        )
        :effect (and 
            (not (current-place ?place))
            (waiting ?place)
        )
    )
    (:action wait
        :parameters (?place - place)
        :precondition (waiting ?place)
        :effect (and 
            (increase (current-time) 15)
            ;(increase (heuristic) 1000)
        )
    )
    (:action end-wait
        :parameters (?place - place)
        :precondition (waiting ?place)
        :effect (and 
            (current-place ?place)
            (not (waiting ?place))
        )
    )
)