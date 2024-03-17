document.addEventListener("DOMContentLoaded", function () {
  window.game = new Chess();

  window.config = {
    draggable: true,
    position: "start",
    dropOffBoard: "snapback", // Snap back to the original position if move is illegal
    sparePieces: false,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
  };

  window.board = Chessboard("board", config);

  function onDrop(source, target) {
    // Check if there's a next move in the history to compare with
    if (moveIndex + 1 < window.game_history.length) {
      var nextMove = window.game_history[moveIndex + 1];

      // Construct the move string to compare with the history (e.g., "e2-e4")
      var attemptedMove = source + "-" + target;

      // Check if the attempted move matches the next move's source and target
      if (nextMove.from === source && nextMove.to === target) {
        // If the move is in history, attempt to make the move
        var move = game.move({
          from: source,
          to: target,
          promotion: "q", // Assuming promotion to queen for simplicity
        });

        // If move is successful, update history and board position
        if (move) {
          moveIndex++;
          updateBoard();
          setTimeout(function () {
            autoPlayNextMove();
          }, 500); // Add a slight delay for the automatic move

          return;
        }
      }
    }

    // If move is not in history or illegal, snap back
    return "snapback";
  }

  function autoPlayNextMove() {
    if (moveIndex < window.game_history.length - 1) {
      moveIndex++;
      var nextMove = window.game_history[moveIndex];
      game.move(nextMove.san); // Execute the next move automatically
      updateBoard();
    }
  }

  function onSnapEnd() {
    // Update the board position to reflect the game's state
    board.position(game.fen());
  }

  window.pgn = "";

  game.load_pgn(pgn);
  window.game_history = game.history({ verbose: true });
  game.reset();
  window.moveIndex = -1; // Adjusted for zero-based indexing of history

  function updateGameHistory(move) {
    // This function updates the history and move index after a manual move
    window.game_history = game.history({ verbose: true });
    moveIndex = window.game_history.length - 1; // Update to the latest move
  }

  function updateBoard() {
    board.position(game.fen());
  }

  function nextMove() {
    if (moveIndex < window.game_history.length - 1) {
      moveIndex++;
      game.move(window.game_history[moveIndex].san); // Move forward in history
      updateBoard();
    }
  }

  function prevMove() {
    if (moveIndex >= 0) {
      game.undo(); // Undo the move
      moveIndex--;
      updateBoard();
    }
  }

  document.getElementById("nextBtn").addEventListener("click", nextMove);
  document.getElementById("prevBtn").addEventListener("click", prevMove);
  document.getElementById("flipBtn").addEventListener("click", function () {
    board.flip();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") {
      // Left arrow pressed
      prevMove();
    } else if (event.key === "ArrowRight") {
      // Right arrow pressed
      nextMove();
    }
  });

  document.getElementById("gameList").addEventListener("change", function () {
    const filePath = this.value;
    if (filePath) {
      fetch(filePath)
        .then((response) => response.text())
        .then((pgn) => {
          game.load_pgn(pgn);
          window.game_history = game.history({ verbose: true });
          game.reset();
          window.moveIndex = -1;
          board.position(game.fen());
        });
    }
  });

  fetch("studies.json")
    .then((response) => response.json())
    .then((games) => {
      const gameList = document.getElementById("gameList");
      games.forEach((game) => {
        const option = document.createElement("option");
        option.value = game.file;
        option.textContent = game.name;
        gameList.appendChild(option);
      });
    });
});
