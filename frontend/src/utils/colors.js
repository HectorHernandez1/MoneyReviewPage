// Shared color utility for consistent coloring across all charts
export const CHART_COLORS = [
  '#ff6b6b', // Bright Red
  '#4ecdc4', // Teal
  '#45b7d1', // Sky Blue  
  '#f9ca24', // Golden Yellow
  '#6c5ce7', // Purple
  '#fd79a8', // Pink
  '#00b894', // Green
  '#fdcb6e', // Orange
  '#e17055', // Coral
  '#74b9ff', // Light Blue
  '#a29bfe', // Lavender
  '#ff9ff3', // Hot Pink
  '#00cec9', // Cyan
  '#55a3ff', // Blue
  '#ff7675', // Salmon
  '#26de81', // Mint Green
  '#ffa726', // Deep Orange
  '#9c88ff', // Violet
  '#ff9ff3', // Magenta
  '#54a0ff', // Bright Blue
  '#5f27cd', // Deep Purple
  '#00d2d3', // Turquoise
  '#ff9f43', // Bright Orange
  '#ee5a6f', // Rose
  '#0abde3', // Electric Blue
  '#10ac84', // Emerald
  '#f368e0', // Fuchsia
  '#ff6348', // Tomato
  '#7bed9f', // Light Green
  '#70a1ff'  // Periwinkle
];

// Create a consistent color mapping function
export const getCategoryColor = (category) => {
  // Create a simple hash of the category name to ensure consistency
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    const char = category.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get a consistent index
  const colorIndex = Math.abs(hash) % CHART_COLORS.length;
  return CHART_COLORS[colorIndex];
};