import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Helper para saber a cor da carta
const getSuitColor = (suit) => (suit === '♥' || suit === '♦' ? 'red' : 'black');

// Criar e embaralhar o baralho
const createDeck = () => {
  let deck = [];
  let id = 1;
  for (let suit of SUITS) {
    for (let valueIndex = 0; valueIndex < VALUES.length; valueIndex++) {
      deck.push({
        id: id++,
        suit,
        value: VALUES[valueIndex],
        valueNum: valueIndex + 1, // A=1, K=13
        color: getSuitColor(suit),
        faceUp: false,
      });
    }
  }
  // Embaralhar (Fisher-Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export default function SolitaireGame() {
  const [stock, setStock] = useState([]);
  const [waste, setWaste] = useState([]);
  const [foundations, setFoundations] = useState([[], [], [], []]);
  const [tableau, setTableau] = useState([[], [], [], [], [], [], []]);
  const [selectedCard, setSelectedCard] = useState(null); // { source: 'tableau' | 'waste', colIndex, cardIndex, card }

  // Iniciar novo jogo
  const startNewGame = () => {
    const deck = createDeck();
    let deckIndex = 0;

    // Distribuir no Tableau (Mesa)
    const newTableau = [[], [], [], [], [], [], []];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j <= i; j++) {
        const card = deck[deckIndex++];
        if (j === i) card.faceUp = true; // Última carta de cada coluna virada para cima
        newTableau[i].push(card);
      }
    }

    // O restante vai para o Stock
    const newStock = deck.slice(deckIndex);

    setTableau(newTableau);
    setStock(newStock);
    setWaste([]);
    setFoundations([[], [], [], []]);
    setSelectedCard(null);
  };

  useEffect(() => {
    startNewGame();
  }, []);

  // Comprar carta do Stock
  const handleStockClick = () => {
    if (stock.length > 0) {
      const nextCard = { ...stock[stock.length - 1], faceUp: true };
      setWaste([...waste, nextCard]);
      setStock(stock.slice(0, stock.length - 1));
    } else if (waste.length > 0) {
      // Reciclar o waste para o stock
      const newStock = waste.reverse().map((card) => ({ ...card, faceUp: false }));
      setStock(newStock);
      setWaste([]);
    }
    setSelectedCard(null);
  };

  // Selecionar carta ou mover para Tableau
  const handleTableauCardClick = (colIndex, cardIndex) => {
    const col = tableau[colIndex];
    const clickedCard = col[cardIndex];

    // Se já temos uma carta selecionada, tentar mover para esta coluna
    if (selectedCard) {
      moveSelectedCardToTableau(colIndex);
      return;
    }

    // Se a carta estiver virada para baixo e for a última, vira para cima
    if (clickedCard && !clickedCard.faceUp && cardIndex === col.length - 1) {
      const updatedTableau = [...tableau];
      updatedTableau[colIndex][cardIndex].faceUp = true;
      setTableau(updatedTableau);
      return;
    }

    // Selecionar conjunto de cartas
    if (clickedCard && clickedCard.faceUp) {
      setSelectedCard({
        source: 'tableau',
        colIndex,
        cardIndex,
        card: clickedCard,
      });
    }
  };

  // Mover carta selecionada para uma coluna do Tableau
  const moveSelectedCardToTableau = (targetColIndex) => {
    if (!selectedCard) return;

    const targetCol = tableau[targetColIndex];
    const targetCard = targetCol[targetCol.length - 1];

    let sourceCards = [];
    if (selectedCard.source === 'waste') {
      sourceCards = [waste[waste.length - 1]];
    } else if (selectedCard.source === 'tableau') {
      sourceCards = tableau[selectedCard.colIndex].slice(selectedCard.cardIndex);
    }

    const firstSourceCard = sourceCards[0];

    // Regras do Solitaire:
    // 1. Coluna vazia só aceita Rei (K / valueNum === 13)
    // 2. Coluna ocupada precisa ser de cor oposta e valor numérico imediatamente inferior (ex: 9 vermelho sob 10 preto)
    const isValidMove =
      (!targetCard && firstSourceCard.valueNum === 13) ||
      (targetCard &&
        targetCard.color !== firstSourceCard.color &&
        targetCard.valueNum === firstSourceCard.valueNum + 1);

    if (isValidMove) {
      const newTableau = [...tableau];

      // Remove da origem
      if (selectedCard.source === 'waste') {
        setWaste(waste.slice(0, waste.length - 1));
      } else {
        newTableau[selectedCard.colIndex] = newTableau[selectedCard.colIndex].slice(
          0,
          selectedCard.cardIndex
        );
      }

      // Adiciona ao destino
      newTableau[targetColIndex] = [...newTableau[targetColIndex], ...sourceCards];

      setTableau(newTableau);
    }

    setSelectedCard(null);
  };

  // Mover para as Pilhas de Fundação (Ás até Rei por naipe)
  const handleFoundationClick = (foundationIndex) => {
    if (!selectedCard) return;

    // Só é possível mover 1 carta por vez para a Fundação
    if (
      selectedCard.source === 'tableau' &&
      selectedCard.cardIndex !== tableau[selectedCard.colIndex].length - 1
    ) {
      setSelectedCard(null);
      return;
    }

    const cardToMove = selectedCard.card;
    const foundation = foundations[foundationIndex];
    const topFoundationCard = foundation[foundation.length - 1];

    // Regras da Fundação:
    // 1. Fundação vazia aceita apenas Ás (valueNum === 1)
    // 2. Mesma cor/naipe e valor sequencial (ex: 2 de ♥ sobre Ás de ♥)
    const isValidMove =
      (!topFoundationCard && cardToMove.valueNum === 1) ||
      (topFoundationCard &&
        topFoundationCard.suit === cardToMove.suit &&
        topFoundationCard.valueNum + 1 === cardToMove.valueNum);

    if (isValidMove) {
      const newFoundations = [...foundations];
      newFoundations[foundationIndex] = [...foundation, cardToMove];
      setFoundations(newFoundations);

      // Remover da origem
      if (selectedCard.source === 'waste') {
        setWaste(waste.slice(0, waste.length - 1));
      } else {
        const newTableau = [...tableau];
        newTableau[selectedCard.colIndex].pop();
        setTableau(newTableau);
      }

      // Checar vitória (52 cartas nas fundações)
      const totalInFoundations =
        newFoundations.reduce((acc, current) => acc + current.length, 0);
      if (totalInFoundations === 52) {
        Alert.alert('Parabéns!', 'Você venceu o jogo!');
      }
    }

    setSelectedCard(null);
  };

  // Selecionar carta do Waste
  const handleWasteClick = () => {
    if (waste.length > 0) {
      setSelectedCard({
        source: 'waste',
        card: waste[waste.length - 1],
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Botão de reiniciar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.button} onPress={startNewGame}>
          <Text style={styles.buttonText}>Novo Jogo</Text>
        </TouchableOpacity>
      </View>

      {/* Áreas Superiores: Stock, Waste e Foundations */}
      <View style={styles.topSection}>
        <View style={styles.row}>
          {/* Stock */}
          <TouchableOpacity style={[styles.card, styles.cardBack]} onPress={handleStockClick}>
            <Text style={styles.cardBackText}>{stock.length}</Text>
          </TouchableOpacity>

          {/* Waste */}
          <TouchableOpacity
            style={[
              styles.card,
              selectedCard?.source === 'waste' && styles.selectedCard,
            ]}
            onPress={handleWasteClick}
          >
            {waste.length > 0 ? (
              <CardView card={waste[waste.length - 1]} />
            ) : (
              <View />
            )}
          </TouchableOpacity>
        </View>

        {/* Foundations (4 pilhas) */}
        <View style={styles.row}>
          {foundations.map((foundation, index) => {
            const topCard = foundation[foundation.length - 1];
            return (
              <TouchableOpacity
                key={index}
                style={styles.cardHolder}
                onPress={() => handleFoundationClick(index)}
              >
                {topCard ? <CardView card={topCard} /> : <Text style={styles.placeholderText}>A</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tableau (7 Colunas) */}
      <ScrollView contentContainerStyle={styles.tableauContainer} horizontal>
        <View style={styles.row}>
          {tableau.map((column, colIndex) => (
            <TouchableOpacity
              key={colIndex}
              style={styles.column}
              activeOpacity={0.8}
              onPress={() => handleTableauCardClick(colIndex, column.length - 1)}
            >
              {column.length === 0 ? (
                <View style={styles.cardHolder} />
              ) : (
                column.map((card, cardIndex) => {
                  const isSelected =
                    selectedCard?.source === 'tableau' &&
                    selectedCard?.colIndex === colIndex &&
                    selectedCard?.cardIndex <= cardIndex;

                  return (
                    <TouchableOpacity
                      key={card.id}
                      activeOpacity={0.9}
                      style={[
                        styles.tableauCard,
                        { top: cardIndex * 22 },
                        isSelected && styles.selectedCard,
                      ]}
                      onPress={() => handleTableauCardClick(colIndex, cardIndex)}
                    >
                      {card.faceUp ? (
                        <CardView card={card} />
                      ) : (
                        <View style={[styles.card, styles.cardBack]} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Componente para renderizar a carta
const CardView = ({ card }) => (
  <View style={styles.card}>
    <Text style={[styles.cardText, { color: card.color }]}>
      {card.value}
    </Text>
    <Text style={[styles.cardSuit, { color: card.color }]}>
      {card.suit}
    </Text>
  </View>
);

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.floor(width / 8.5);
const CARD_HEIGHT = Math.floor(CARD_WIDTH * 1.4);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b5e20',
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'space-between',
    padding: 4,
    marginHorizontal: 2,
  },
  cardHolder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBack: {
    backgroundColor: '#0d47a1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cardText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardSuit: {
    fontSize: 16,
    alignSelf: 'flex-end',
  },
  selectedCard: {
    borderColor: '#ffeb3b',
    borderWidth: 2.5,
  },
  tableauContainer: {
    paddingHorizontal: 10,
  },
  column: {
    width: CARD_WIDTH + 4,
    height: 400,
    position: 'relative',
  },
  tableauCard: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
