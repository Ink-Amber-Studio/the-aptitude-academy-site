module.exports = {
  content: ['./*.html', './blog/**/*.html', './js/**/*.js'],
  theme: { extend: {
    colors: { ink: '#020202', brand: '#EA3726', 'brand-dark': '#C42B1C', muted: '#5C5E5D', grey: '#747675', silver: '#B3B2AF', paper: '#F6F6F4', line: '#E3E3DF', blush: '#FFF2F0', white: '#FFFFFF' },
    fontFamily: { display: ['Cabin', 'Arial', 'sans-serif'], body: ['Arial', 'sans-serif'] },
    boxShadow: { panel: '0 20px 70px -35px rgba(2,2,2,.2), 0 2px 10px rgba(2,2,2,.025)' }
  } },
  plugins: []
};
