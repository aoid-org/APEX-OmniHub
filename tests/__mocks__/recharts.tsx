import React from 'react';

const Dummy = (props: any) => {
  return React.createElement('div', { 'data-testid': props['data-testid'] || 'recharts-dummy' }, props.children);
};

export const LineChart = (props: any) => React.createElement('div', { 'data-testid': 'line-chart' }, props.children);
export const ResponsiveContainer = Dummy;
export const Line = Dummy;
export const BarChart = Dummy;
export const Bar = Dummy;
export const PieChart = Dummy;
export const Pie = Dummy;
export const Cell = Dummy;
export const XAxis = Dummy;
export const YAxis = Dummy;
export const CartesianGrid = Dummy;
export const Tooltip = Dummy;
export const ReferenceLine = Dummy;
export const Legend = Dummy;

export default {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend
};
