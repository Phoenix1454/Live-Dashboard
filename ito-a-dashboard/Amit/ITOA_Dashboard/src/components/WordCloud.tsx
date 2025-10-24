import { motion } from 'motion/react';

interface WordData {
  text: string;
  value: number;
}

interface WordCloudProps {
  words: WordData[];
}

export function WordCloud({ words }: WordCloudProps) {
  // Sort words by value descending
  const sortedWords = [...words].sort((a, b) => b.value - a.value);
  
  // Calculate font sizes
  const maxValue = Math.max(...words.map(w => w.value));
  const minValue = Math.min(...words.map(w => w.value));
  
  const getFontSize = (value: number) => {
    const minSize = 14;
    const maxSize = 48;
    const normalized = (value - minValue) / (maxValue - minValue);
    return minSize + normalized * (maxSize - minSize);
  };

  const colors = ['#14b8a6', '#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899'];
  
  const getColor = (index: number) => {
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-4">
      {sortedWords.map((word, index) => (
        <motion.div
          key={word.text}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: index * 0.03 }}
          whileHover={{ scale: 1.1 }}
          className="cursor-pointer transition-transform"
          style={{
            fontSize: `${getFontSize(word.value)}px`,
            color: getColor(index),
            fontWeight: 600,
          }}
          title={`${word.text}: ${word.value}`}
        >
          {word.text}
        </motion.div>
      ))}
    </div>
  );
}
