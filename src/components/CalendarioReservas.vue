<template>
  <div class="container">
    <h2>Reserva de Masajistas</h2>

    <!-- 📌 Lista de Clientes (Draggable) -->
    <div class="clientes">
      <h3>Clientes</h3>
      <div id="external-events">
        <div v-for="cliente in clientes" :key="cliente.id" class="cliente-item fc-event" :data-id="cliente.id" :data-nombre="cliente.nombre">
          {{ cliente.nombre }}
        </div>
      </div>
    </div>

    <!-- 📌 Calendario FullCalendar -->
    <FullCalendar class="calendario" :options="calendarOptions" />

    <!-- 📌 Modal para seleccionar Masajista y Hora -->
    <Dialog v-model:visible="showDialog" header="Seleccionar Masajista y Hora" modal>
      <div class="p-field">
        <label>Cliente</label>
        <InputText v-model="selectedCliente.nombre" disabled />
      </div>
      <div class="p-field">
        <label for="masajista">Selecciona un Masajista</label>
        <Dropdown v-model="selectedMasajista" :options="masajistas" optionLabel="nombre" placeholder="Seleccionar..." />
      </div>
      <div class="p-field">
        <label for="rangoHoras">Selecciona el Rango de Horas</label>
        <Dropdown v-model="hora" :options="rangosHoras" placeholder="Seleccionar..." />
      </div>
      <Button label="Confirmar Reserva" icon="pi pi-check" @click="agendarCita" />
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

// Generador de IDs únicos
const generateUniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

const showDialog = ref(false);
const selectedDate = ref(null);
const selectedCliente = ref({});
const selectedMasajista = ref(null);
const hora = ref(null);
const currentEventId = ref(null); // Para almacenar el ID del evento que se está editando

const clientes = ref([
  { id: 1, nombre: 'Juan Pérez' },
  { id: 2, nombre: 'María López' },
  { id: 3, nombre: 'Carlos Ramírez' }
]);

const masajistas = ref([
  { id: 1, nombre: 'Ana Pérez' },
  { id: 2, nombre: 'Carlos Gómez' },
  { id: 3, nombre: 'Sofía Ramírez' }
]);

const rangosHoras = ref([
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '14:00 - 15:00',
  '15:00 - 16:00'
]);

const calendarEvents = ref([]); // Lista de eventos independientes

const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  editable: true,
  droppable: true,
  events: calendarEvents.value,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay'
  },
  eventReceive: (info) => {
    const vistaActual = info.view.type;

    // Capturamos el cliente seleccionado y generamos un ID único
    selectedCliente.value = JSON.parse(JSON.stringify(clientes.value.find(cliente => cliente.nombre === info.event.title)));
    selectedDate.value = info.event.startStr;
    currentEventId.value = generateUniqueId(); // Generamos un ID único para la cita

    // Si la vista es mes o semana, mostramos el modal y eliminamos el evento temporal
    if (vistaActual === 'dayGridMonth' || vistaActual === 'timeGridWeek') {
      showDialog.value = true;
      info.event.remove();
    } else {
      // Si está en vista de día, agregamos la cita directamente
      agregarEvento(selectedCliente.value.nombre, selectedDate.value);
    }
  },
  eventDrop: (info) => {
    // ✅ Guardamos manualmente la nueva fecha cuando se mueve un evento
    const eventoIndex = calendarEvents.value.findIndex(evento => evento.id === info.event.id);
    if (eventoIndex !== -1) {
      calendarEvents.value[eventoIndex].start = info.event.startStr;
      actualizarEventos();
    }
  }
});

// ✅ Hacer que los clientes sean "arrastrables"
onMounted(() => {
  new Draggable(document.getElementById('external-events'), {
    itemSelector: '.fc-event',
    eventData: function(eventEl) {
      return {
        id: generateUniqueId(), // Asignamos un ID único al evento
        title: eventEl.getAttribute('data-nombre'),
        duration: '01:00' // Duración predeterminada
      };
    }
  });
});

// ✅ Agregar evento correctamente
const agregarEvento = (nombre, fecha) => {
  const nuevaCita = {
    id: generateUniqueId(),
    title: `Cita con ${nombre}`,
    start: fecha,
    editable: true
  };

  calendarEvents.value = [...calendarEvents.value, nuevaCita]; // ✅ Se genera un nuevo array para evitar referencias compartidas
  actualizarEventos();
};

// ✅ Forzar actualización en Vue
const actualizarEventos = async () => {
  await nextTick();
  calendarOptions.value.events = [...calendarEvents.value]; // ✅ Se genera un nuevo array para evitar que Vue reactive todas las citas
};

// ✅ Agregar la cita después de completar el formulario
const agendarCita = () => {
  if (!selectedMasajista.value || !hora.value) {
    alert('Por favor, completa todos los campos.');
    return;
  }

  agregarEvento(`${selectedCliente.value.nombre} (Masajista: ${selectedMasajista.value.nombre}, ${hora.value})`, selectedDate.value);
  showDialog.value = false;
};
</script>

<style scoped>
.container {
  display: flex;
  gap: 20px;
}
.clientes {
  width: 200px;
  background: #f7f7f7;
  padding: 10px;
  border-radius: 5px;
}
#external-events {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cliente-item {
  background: #4caf50;
  color: white;
  padding: 8px;
  border-radius: 4px;
  cursor: grab;
  text-align: center;
}
.calendario {
  flex-grow: 1;
}
</style>
