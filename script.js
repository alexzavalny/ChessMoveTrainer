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
    // Проверяем следующий ход в истории для сравнения
    if (moveIndex + 1 < window.game_history.length) {
      var nextMove = window.game_history[moveIndex + 1];
      var attemptedMove = source + "-" + target;

      if (nextMove.from === source && nextMove.to === target) {
        var move = game.move({
          from: source,
          to: target,
          promotion: "q", // Автоматическое продвижение в ферзи
        });

        if (move) {
          moveIndex++;
          updateBoard();
          setTimeout(function () {
            autoPlayNextMove();
          }, 500);
          return;
        }
      }
    }
    return "snapback";
  }

  function autoPlayNextMove() {
    if (moveIndex < window.game_history.length - 1) {
      moveIndex++;
      var nextMove = window.game_history[moveIndex];
      game.move(nextMove.san);
      updateBoard();
    }
  }

  function onSnapEnd() {
    board.position(game.fen());
  }

  window.pgn = "";

  game.load_pgn(pgn);
  window.game_history = game.history({ verbose: true });
  game.reset();
  window.moveIndex = -1;

  function updateGameHistory(move) {
    window.game_history = game.history({ verbose: true });
    moveIndex = window.game_history.length - 1;
  }

  function updateBoard() {
    board.position(game.fen());
  }

  function nextMove() {
    if (moveIndex < window.game_history.length - 1) {
      moveIndex++;
      game.move(window.game_history[moveIndex].san);
      updateBoard();
    }
  }

  function prevMove() {
    if (moveIndex >= 0) {
      game.undo();
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
      prevMove();
    } else if (event.key === "ArrowRight") {
      nextMove();
    }
  });

  document.getElementById("gameList").addEventListener("change", function () {
    const selectedOption = this.options[this.selectedIndex];
    const playFor = selectedOption.getAttribute("data-play-for"); // Получаем play_for из выбранной опции
    const filePath = selectedOption.value;

    if (filePath) {
      fetch(filePath)
        .then((response) => response.text())
        .then((pgn) => {
          game.load_pgn(pgn);
          window.game_history = game.history({ verbose: true });
          game.reset();
          window.moveIndex = -1;
          board.position(game.fen());

          // Проверяем, играем ли мы за черных, и если да, то переворачиваем доску
          if (playFor === "black") {
            if (board.orientation() !== "black") {
              board.flip();
            }
            autoPlayNextMove(); // Сделать первый ход автоматически, если играешь за черных
          } else if (playFor === "white" && board.orientation() !== "white") {
            // Убедиться, что доска ориентирована правильно для игры белыми
            board.flip();
          }
        });
    }
  });

  // Загрузка и фильтрация игр по тегам
  fetch("studies.json")
    .then((response) => response.json())
    .then((games) => {
      const gameList = document.getElementById("gameList");
      const tagSet = new Set(["all"]); // Для уникальных тегов

      games.forEach((game) => {
        const option = document.createElement("option");
        option.value = game.file;
        option.textContent = game.name;
        option.setAttribute("data-play-for", game.play_for);
        gameList.appendChild(option);

        game.tags.forEach((tag) => tagSet.add(tag));
      });

      const tagList = document.getElementById("tagList");
      tagSet.forEach((tag) => {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        tagList.appendChild(option);
      });
    });

  document.getElementById("tagList").addEventListener("change", function () {
    const selectedTag = this.value;
    fetch("studies.json")
      .then((response) => response.json())
      .then((games) => {
        const gameList = document.getElementById("gameList");
        gameList.innerHTML = "<option>Select a game...</option>";

        games.forEach((game) => {
          if (selectedTag === "all" || game.tags.includes(selectedTag)) {
            const option = document.createElement("option");
            option.value = game.file;
            option.textContent = game.name;
            option.setAttribute("data-play-for", game.play_for);
            gameList.appendChild(option);
          }
        });
      });
  });
});
