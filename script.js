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
          //updateBoard();
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

  // on nextLineBtn click, trigger selecting next line from line dropdown
  document.getElementById("nextLineBtn").addEventListener("click", function () {
    const lineList = document.getElementById("lineList");
    const selectedIndex = lineList.selectedIndex;
    if (selectedIndex < lineList.options.length - 1) {
      lineList.selectedIndex = selectedIndex + 1;
      lineList.dispatchEvent(new Event("change"));
    }
  });

  document.getElementById("resetBtn").addEventListener("click", function () {
    // Сброс игры и индекса хода к начальному состоянию
    game.reset();
    window.moveIndex = -1;

    // Загрузка PGN текущей выбранной игры, если таковая имеется
    const selectedGameOption =
      document.getElementById("gameList").selectedOptions[0];
    const filePath = selectedGameOption.value;
    const playFor = selectedGameOption.getAttribute("data-play-for");

    if (filePath) {
      fetch(filePath)
        .then((response) => response.text())
        .then((pgn) => {
          game.load_pgn(pgn);
          window.game_history = game.history({ verbose: true });
          game.reset();
          window.moveIndex = -1;
          updateBoard();

          // Адаптация ориентации доски в соответствии с playFor
          adjustBoardOrientation(playFor);
        });
    } else {
      updateBoard();
    }
  });

  function adjustBoardOrientation(playFor) {
    const currentOrientation = board.orientation();
    if (playFor === "black" && currentOrientation !== "black") {
      board.flip();
    } else if (playFor === "white" && currentOrientation !== "white") {
      board.flip();
    }
  }

  function onSnapEnd() {
    board.position(game.fen());
  }

  function pgn_expand(pgn) {
    // Function to split the PGN into base moves and variations
    function splitPgn(pgn) {
      const stack = [];
      const variations = [];
      let base = "";
      let temp = "";

      for (const char of pgn) {
        if (char === "(") {
          if (stack.length === 0) {
            base += temp;
            temp = "";
          }
          stack.push("(");
        } else if (char === ")") {
          stack.pop();
          if (stack.length === 0) {
            variations.push(temp.trim());
            temp = "";
            continue;
          }
        }
        if (stack.length > 0) {
          temp += char;
        } else {
          base += char;
        }
      }
      return { base: base.trim(), variations };
    }

    // Recursive function to handle nested variations
    function generateVariations(base, variations, prefix = "") {
      if (variations.length === 0) {
        return [prefix + base];
      }

      let result = [];
      for (let i = 0; i < variations.length; i++) {
        const { base: varBase, variations: nestedVariations } = splitPgn(
          variations[i],
        );
        const newBase = base.substring(0, base.indexOf(varBase)) + varBase;
        const newVariations = [
          ...variations.slice(0, i),
          ...variations.slice(i + 1),
          ...nestedVariations,
        ];
        result = result.concat(
          generateVariations(newBase, newVariations, prefix),
        );
      }
      return result;
    }

    const { base, variations } = splitPgn(pgn);
    return generateVariations(base, variations);
  }

  // Example usage:
  const pgn =
    "1. d4 d5 2. e4 e6 (2... dxe4 3. Nc3 Nc6 4. f3 exf3) 3. Nc3 Bb4 *";
  const expandedPgn = pgn_expand(pgn);
  console.log(expandedPgn);

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

  function loadFilePath(filePath) {
    fetch(filePath)
      .then((response) => response.text())
      .then((pgn) => {
        game.load_pgn(pgn);
        window.game_history = game.history({ verbose: true });
        game.reset();
        window.moveIndex = -1;
        updateBoard();

        if (window.playFor === "black") {
          autoPlayNextMove();
        }
      });
  }

  document.getElementById("lineList").addEventListener("change", function () {
    const selectedOption = this.options[this.selectedIndex];
    const filePath = selectedOption.value;
    loadFilePath(filePath);
  });

  document.getElementById("gameList").addEventListener("change", function () {
    const selectedOption = this.options[this.selectedIndex];
    window.playFor = selectedOption.getAttribute("data-play-for"); // Получаем play_for из выбранной опции
    const gameId = selectedOption.value;

    const selectedGame = games.find((game) => game.id == gameId);
    const lineList = document.getElementById("lineList");
    // Проверяем, играем ли мы за черных, и если да, то переворачиваем доску
    if (window.playFor === "black") {
      if (board.orientation() !== "black") {
        board.flip();
      }
      //autoPlayNextMove(); // Сделать первый ход автоматически, если играешь за черных
    } else if (window.playFor === "white" && board.orientation() !== "white") {
      // Убедиться, что доска ориентирована правильно для игры белыми
      board.flip();
    }

    // заполняем список линий (lineList select) для выбранной игры
    lineList.innerHTML = "";
    var index = 0;

    var lines = Array.from({ length: selectedGame.lines }, (_, i) => i + 1);
    lines.forEach((line) => {
      const lineCode = `Line${++index}`;
      const option = document.createElement("option");
      option.value = "pgns/" + selectedGame.folder + "/" + lineCode + ".pgn";
      option.textContent = lineCode;
      lineList.appendChild(option);
    });

    loadFilePath("pgns/" + selectedGame.folder + "/Line1.pgn");
  });

  window.games = [];
  // Загрузка и фильтрация игр по тегам
  fetch("studies.json?" + new Date().getTime())
    .then((response) => response.json())
    .then((games) => {
      const gameList = document.getElementById("gameList");
      const tagSet = new Set(["all"]); // Для уникальных тегов
      window.games = games;

      games.forEach((game) => {
        const option = document.createElement("option");
        option.value = game.id;
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
