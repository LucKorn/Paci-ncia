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

// Helper para cor da carta
const getSuitColor = (suit) => (suit === '♥' || suit === '♦' ? '#d32f2f' : '#1a1a1a');

// Criar e embaralhar o baralho (Fisher-Yates)
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

// Cálculo dinâmico para preencher exatamente a tela
const SCREEN_PADDING = 8;
const GAP = 3;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Largura da carta calculada para caber 7 colunas perfeitamente na tela
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - SCREEN_PADDING * 2 - GAP * 6) / 7);
const CARD_HEIGHT = Math.floor(CARD_WIDTH * 1.42);

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
                      { top: cardIndex * (CARD_HEIGHT * 0.28) },
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

const CardView = ({ card }) => (
  <View style={styles.card}>
    <Text style={[styles.cardText, { color: card.color }]}>{card.value}</Text>
    <Text style={[styles.cardSuit, { color: card.color }]}>{card.suit}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b5e20',
    paddingTop: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 3,
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#1b5e20',
    fontSize: 16,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: 16,
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
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#b0bec5',
    justifyContent: 'space-between',
    padding: 3,
  },
  cardHolder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 6,
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
  cardText: {
    fontSize: CARD_WIDTH * 0.3,
    fontWeight: 'bold',
    lineHeight: CARD_WIDTH * 0.32,
  },
  cardSuit: {
    fontSize: CARD_WIDTH * 0.38,
    alignSelf: 'flex-end',
    lineHeight: CARD_WIDTH * 0.4,
  },
  selectedCard: {
    borderColor: '#ffeb3b',
    borderWidth: 3,
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
    
