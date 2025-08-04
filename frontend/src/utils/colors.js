// Shared color utility for consistent coloring across all charts
// High-contrast colors that are easily distinguishable
export const CHART_COLORS = [
  '#1f77b4', // Blue (D3 Category10)
  '#ff7f0e', // Orange
  '#2ca02c', // Green
  '#d62728', // Red
  '#9467bd', // Purple
  '#8c564b', // Brown
  '#e377c2', // Pink
  '#7f7f7f', // Gray
  '#bcbd22', // Olive
  '#17becf', // Cyan
  '#aec7e8', // Light Blue
  '#ffbb78', // Light Orange
  '#98df8a', // Light Green
  '#ff9896', // Light Red
  '#c5b0d5', // Light Purple
  '#c49c94', // Light Brown
  '#f7b6d3', // Light Pink
  '#c7c7c7', // Light Gray
  '#dbdb8d', // Light Olive
  '#9edae5', // Light Cyan
  '#393b79', // Dark Blue (Tableau Classic)
  '#637939', // Dark Green
  '#8c6d31', // Dark Brown
  '#843c39', // Dark Red
  '#7b4173', // Dark Purple
  '#5254a3', // Slate Blue
  '#8ca252', // Sage Green
  '#bd9e39', // Gold
  '#ad494a', // Brick Red
  '#a55194'  // Plum
];

// Store category-to-color mapping to ensure uniqueness
const categoryColorMap = new Map();
let nextColorIndex = 0;

// Create a consistent color mapping function that guarantees unique colors
export const getCategoryColor = (category) => {
  // If we've already assigned a color to this category, return it
  if (categoryColorMap.has(category)) {
    return categoryColorMap.get(category);
  }
  
  // Assign the next available color
  const color = CHART_COLORS[nextColorIndex % CHART_COLORS.length];
  categoryColorMap.set(category, color);
  nextColorIndex++;
  
  return color;
};

// Optional: Reset function for testing or if needed
export const resetCategoryColors = () => {
  categoryColorMap.clear();
  nextColorIndex = 0;
};