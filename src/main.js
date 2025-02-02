import { createApp } from 'vue';
import App from './App.vue';
import PrimeVue from 'primevue/config';

import 'primevue/resources/themes/saga-blue/theme.css'; // Tema (puedes cambiarlo)
import 'primevue/resources/primevue.min.css'; // Estilos base
import 'primeicons/primeicons.css'; // Iconos

const app = createApp(App);
app.use(PrimeVue);
app.mount('#app');
