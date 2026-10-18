import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const getSuitColor = (suit) => (suit === '♥' || suit === '♦' ? '#d32f2f' : '#1a1a1a');

const createDeck = () => {
  let deck = [];
  let id = 1;
  for (let suit of SUITS) {
    for (let valueIndex = 0; valueIndex < VALUES.length; valueIndex++) {
      deck.push({
        id: id++,
        suit,
        value: VALUES[valueIndex],
        valueNum: valueIndex + 1,
        color: getSuitColor(suit),
        faceUp: false,
      });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const SCREEN_PADDING = 4;
const GAP = 2;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_WIDTH = Math.floor((SCREEN_WIDTH - SCREEN_PADDING * 2 - GAP * 6) / 7);
const CARD_HEIGHT = Math.floor(CARD_WIDTH * 1.45);
// Deslocamento vertical garantido para expor todo o cabeçalho superior
const TABLEAU_OFFSET = Math.floor(CARD_HEIGHT * 0.32);

export default function SolitaireGame() {
  const [stock, setStock] = useState([]);
  const [waste, setWaste] = useState([]);
  const [foundations, setFoundations] = useState([[], [], [], []]);
  const [tableau, setTableau] = useState([[], [], [], [], [], [], []]);
  const [selectedCard, setSelectedCard] = useState(null);

  const startNewGame = () => {
    const deck = createDeck();
    let deckIndex = 0;

    const newTableau = [[], [], [], [], [], [], []];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j <= i; j++) {
        const card = deck[deckIndex++];
        if (j === i) card.faceUp = true;
        newTableau[i].push(card);
      }
    }

    setTableau(newTableau);
    setStock(deck.slice(deckIndex));
    setWaste([]);
    setFoundations([[], [], [], []]);
    setSelectedCard(null);
  };

  useEffect(() => {
    startNewGame();
  }, []);

  const handleStockClick = () => {
    if (stock.length > 0) {
      const nextCard = { ...stock[stock.length - 1], faceUp: true };
      setWaste([...waste, nextCard]);
      setStock(stock.slice(0, stock.length - 1));
    } else if (waste.length > 0) {
      const newStock = waste.reverse().map((card) => ({ ...card, faceUp: false }));
      setStock(newStock);
      setWaste([]);
    }
    setSelectedCard(null);
  };

  const handleTableauCardClick = (colIndex, cardIndex) => {
    const col = tableau[colIndex];
    const clickedCard = col[cardIndex];

    if (selectedCard) {
      moveSelectedCardToTableau(colIndex);
      return;
    }

    if (clickedCard && !clickedCard.faceUp && cardIndex === col.length - 1) {
      const updatedTableau = [...tableau];
      updatedTableau[colIndex][cardIndex].faceUp = true;
      setTableau(updatedTableau);
      return;
    }

    if (clickedCard && clickedCard.faceUp) {
      setSelectedCard({
        source: 'tableau',
        colIndex,
        cardIndex,
        card: clickedCard,
      });
    }
  };

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

    const isValidMove =
      (!targetCard && firstSourceCard.valueNum === 13) ||
      (targetCard &&
        targetCard.color !== firstSourceCard.color &&
        targetCard.valueNum === firstSourceCard.valueNum + 1);

    if (isValidMove) {
      const newTableau = [...tableau];

      if (selectedCard.source === 'waste') {
        setWaste(waste.slice(0, waste.length - 1));
      } else {
        newTableau[selectedCard.colIndex] = newTableau[selectedCard.colIndex].slice(
          0,
          selectedCard.cardIndex
        );
      }

      newTableau[targetColIndex] = [...newTableau[targetColIndex], ...sourceCards];
      setTableau(newTableau);
    }

    setSelectedCard(null);
  };

  const handleFoundationClick = (foundationIndex) => {
    if (!selectedCard) return;

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

    const isValidMove =
      (!topFoundationCard && cardToMove.valueNum === 1) ||
      (topFoundationCard &&
        topFoundationCard.suit === cardToMove.suit &&
        topFoundationCard.valueNum + 1 === cardToMove.valueNum);

    if (isValidMove) {
      const newFoundations = [...foundations];
      newFoundations[foundationIndex] = [...foundation, cardToMove];
      setFoundations(newFoundations);

      if (selectedCard.source === 'waste') {
        setWaste(waste.slice(0, waste.length - 1));
      } else {
        const newTableau = [...tableau];
        newTableau[selectedCard.colIndex].pop();
        setTableau(newTableau);
      }

      const totalInFoundations = newFoundations.reduce((acc, curr) => acc + curr.length, 0);
      if (totalInFoundations === 52) {
        Alert.alert('Parabéns!', 'Você venceu o jogo!');
      }
    }

    setSelectedCard(null);
  };

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.button} onPress={startNewGame}>
          <Text style={styles.buttonText}>Novo Jogo</Text>
        </TouchableOpacity>
      </View>

      {/* Áreas Superiores */}
      <View style={styles.topSection}>
        <View style={styles.stockWasteRow}>
          <TouchableOpacity style={[styles.card, styles.cardBack]} onPress={handleStockClick}>
            <Text style={styles.cardBackText}>{stock.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.card,
              selectedCard?.source === 'waste' && styles.selectedCard,
            ]}
            onPress={handleWasteClick}
          >
            {waste.length > 0 ? <CardView card={waste[waste.length - 1]} /> : <View />}
          </TouchableOpacity>
        </View>

        <View style={styles.foundationsRow}>
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

      {/* Tableau (Mesa Principal) */}
      <View style={styles.tableauContainer}>
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
                      { top: cardIndex * TABLEAU_OFFSET },
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
    </SafeAreaView>
  );
}

// Componente da Carta ajustado para visibilidade completa
const CardView = ({ card }) => (
  <View style={styles.card}>
    {/* Cabeçalho que fica SEMPRE visível na pilha */}
    <View style={styles.cardHeader}>
      <Text style={[styles.cardText, { color: card.color }]}>{card.value}</Text>
      <Text style={[styles.cardTopSuit, { color: card.color }]}>{card.suit}</Text>
    </View>
    {/* Naipe central com tamanho equilibrado */}
    <View style={styles.centerContainer}>
      <Text style={[styles.cardCenterSuit, { color: card.color }]}>{card.suit}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b5e20',
    paddingTop: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 3,
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#1b5e20',
    fontSize: 14,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: 12,
  },
  stockWasteRow: {
    flexDirection: 'row',
    gap: GAP,
  },
  foundationsRow: {
    flexDirection: 'row',
    gap: GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#ffffff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#b0bec5',
    padding: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  cardText: {
    fontSize: Math.floor(CARD_WIDTH * 0.35),
    fontWeight: '900',
    lineHeight: Math.floor(CARD_WIDTH * 0.38),
  },
  cardTopSuit: {
    fontSize: Math.floor(CARD_WIDTH * 0.32),
    lineHeight: Math.floor(CARD_WIDTH * 0.35),
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCenterSuit: {
    fontSize: Math.floor(CARD_WIDTH * 0.45), // Tamanho reduzido para não cortar
    lineHeight: Math.floor(CARD_WIDTH * 0.48),
  },
  cardHolder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: CARD_WIDTH * 0.4,
    fontWeight: 'bold',
  },
  cardBack: {
    backgroundColor: '#1565c0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: CARD_WIDTH * 0.35,
  },
  selectedCard: {
    borderColor: '#ffeb3b',
    borderWidth: 2.5,
  },
  tableauContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    flex: 1,
  },
  column: {
    width: CARD_WIDTH,
    height: '100%',
    position: 'relative',
  },
  tableauCard: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
