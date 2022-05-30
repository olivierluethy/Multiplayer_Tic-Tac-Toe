var turn = 1; // Sets that player "X" starts
var player_turn = document.getElementById("player_turn"); // Get element of id "player_turn" for changing the text

// Get every box from the container via id
var box1 = document.getElementById('box1');
var box2 = document.getElementById("box2");
var box3 = document.getElementById("box3");
var box4 = document.getElementById("box4");
var box5 = document.getElementById("box5");
var box6 = document.getElementById("box6");
var box7 = document.getElementById("box7");
var box8 = document.getElementById("box8");
var box9 = document.getElementById("box9");

// If first box has been clicked
function function1() {
    if (turn == 1) {
        if (box1.innerHTML == "") {
            box1.innerText = 'X';
            player_turn.innerHTML = "Player O's turn";
            turn++;
        } else {
            alert("Field is already marked.");
        }
    } else if (turn == 2) {
        if (box1.innerHTML == "") {
            box1.innerText = 'O';
            player_turn.innerHTML = "Player X's turn";
            turn--;
        } else {
            alert("Field is already marked.");
        }
    }
}
// If second box has been clicked
function function2() {
    if (turn == 1) {
        if (box2.innerHTML == "") {
            box2.innerText = 'X';
            player_turn.innerHTML = "Player O's turn";
            turn++;
        } else {
            alert("Field is already marked.");
        }
    } else if (turn == 2) {
        if (box2.innerHTML == "") {
            box2.innerText = 'O';
            player_turn.innerHTML = "Player X's turn";
            turn--;
        } else {
            alert("Field is already marked.");
        }
    }
}
// If third box has been clicked
function function3() {
    if (turn == 1) {
        if (box3.innerHTML == "") {
            box3.innerText = 'X';
            player_turn.innerHTML = "Player O's turn";
            turn++;
        } else {
            alert("Field is already marked.");
        }
    } else if (turn == 2) {
        if (box3.innerHTML == "") {
            box3.innerText = 'O';
            player_turn.innerHTML = "Player X's turn";
            turn--;
        } else {
            alert("Field is already marked.");
        }
    }
}
// If forth box has been clicked
function function4() {
    if (turn == 1) {
        if (box4.innerHTML == "") {
            box4.innerText = 'X';
            player_turn.innerHTML = "Player O's turn";
            turn++;
        } else {
            alert("Field is already marked.");
        }
    } else if (turn == 2) {
        if (box4.innerHTML == "") {
            box4.innerText = 'O';
            player_turn.innerHTML = "Player X's turn";
            turn--;
        } else {
            alert("Field is already marked.");
        }
    }
}
// If fifth box has been clicked
function function5() {
    if (turn == 1) {
        if (box5.innerHTML == "") {
            box5.innerText = 'X';
            player_turn.innerHTML = "Player O's turn";
            turn++;
        } else {
            alert("Field is already marked.");
        }
    } else if (turn == 2) {
        if (box5.innerHTML == "") {
            box5.innerText = 'O';
            player_turn.innerHTML = "Player X's turn";
            turn--;
        } else {
            alert("Field is already marked.");
        }
    }
}
// If sixth box has been clicked
function function6() {
    if (turn == 1) {
        if (box6.innerHTML == "") {
            box6.innerText = 'X';
            player_turn.innerHTML = "Player O's turn";
            turn++;
        } else {
            alert("Field is already marked.");
        }
    } else if (turn == 2) {
        if (box6.innerHTML == "") {
            box6.innerText = 'O';
            player_turn.innerHTML = "Player X's turn";
            turn--;
        } else {
            alert("Field is already marked.");
        }
    }
}
// If seventh box has been clicked
function function7() {
    if (turn == 1) {
        if (box7.innerHTML == "") {
            box7.innerText = 'X';
            player_turn.innerHTML = "Player O's turn";
            turn++;
        } else {
            alert("Field is already marked.");
        }
    } else if (turn == 2) {
        if (box7.innerHTML == "") {
            box7.innerText = 'O';
            player_turn.innerHTML = "Player X's turn";
            turn--;
        } else {
            alert("Field is already marked.");
        }
    }
}
// If eighth box has been clicked
function function8() {
    if (turn == 1) {
        if (box8.innerHTML == "") {
            box8.innerText = 'X';
            player_turn.innerHTML = "Player O's turn";
            turn++;
        } else {
            alert("Field is already marked.");
        }
    } else if (turn == 2) {
        if (box8.innerHTML == "") {
            box8.innerText = 'O';
            player_turn.innerHTML = "Player X's turn";
            turn--;
        } else {
            alert("Field is already marked.");
        }
    }
}
// If ninth box has been clicked
function function9() {
    if (turn == 1) {
        if (box9.innerHTML == "") {
            box9.innerText = 'X';
            player_turn.innerHTML = "Player O's turn";
            turn++;
        } else {
            alert("Field is already marked.");
        }
    } else if (turn == 2) {
        if (box9.innerHTML == "") {
            box9.innerText = 'O';
            player_turn.innerHTML = "Player X's turn";
            turn--;
        } else {
            alert("Field is already marked.");
        }
    }
}