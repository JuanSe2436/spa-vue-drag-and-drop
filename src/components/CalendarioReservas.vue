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

    <!-- 📌 Modal para CREAR y EDITAR Citas -->
    <Dialog v-model:visible="showDialog" :header="selectedEvent.id ? 'Editar Cita' : 'Crear Reserva'" modal>
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
      
      <!-- Botón de Guardar -->
      <Button v-if="selectedEvent.id" label="Guardar Cambios" icon="pi pi-check" @click="guardarEdicion" />
      <Button v-else label="Confirmar Reserva" icon="pi pi-check" @click="agendarCita" />

      <!-- Botón de Eliminar (solo en edición) -->
      <Button v-if="selectedEvent.id" label="Eliminar Cita" icon="pi pi-trash" class="p-button-danger" @click="eliminarEvento(selectedEvent.id)" />
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
const selectedEvent = ref({});

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

const calendarEvents = ref([]);

const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  editable: true,
  droppable: true,
  eventResizableFromStart: false,
  eventDurationEditable: false,
  allDaySlot: true,
  events: calendarEvents.value,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay'
  },
  eventClick: (info) => {
    // ✅ Modo edición
    selectedEvent.value = calendarEvents.value.find(evento => evento.id === info.event.id);
    selectedCliente.value = { nombre: selectedEvent.value.title.replace("Cita con ", "") };
    selectedMasajista.value = masajistas.value.find(m => m.nombre === selectedEvent.value.masajista) || null;
    hora.value = selectedEvent.value.hora || null;

    showDialog.value = true;
  },
  eventReceive: (info) => {
    // ✅ Modo creación
    selectedCliente.value = clientes.value.find(cliente => cliente.nombre === info.event.title);
    selectedDate.value = info.event.startStr;
    selectedEvent.value = {}; // Asegurar que no esté en modo edición
    showDialog.value = true;

    info.event.remove(); // Se elimina para evitar duplicados hasta confirmar la reserva
  }
});

// ✅ Hacer que los clientes sean "arrastrables"
onMounted(() => {
  new Draggable(document.getElementById('external-events'), {
    itemSelector: '.fc-event',
    eventData: function(eventEl) {
      return {
        id: generateUniqueId(),
        title: eventEl.getAttribute('data-nombre'),
        duration: '01:00'
      };
    }
  });
});

// ✅ Crear nueva cita
const agendarCita = () => {
  if (!selectedMasajista.value || !hora.value) {
    alert('Por favor, completa todos los campos.');
    return;
  }

  const nuevaCita = {
    id: generateUniqueId(),
    title: `Cita con ${selectedCliente.value.nombre}`,
    start: selectedDate.value,
    masajista: selectedMasajista.value.nombre,
    hora: hora.value,
    editable: true
  };

  calendarEvents.value = [...calendarEvents.value, nuevaCita];
  actualizarEventos();
  showDialog.value = false;
};

// ✅ Guardar edición del evento
const guardarEdicion = () => {
  const eventoIndex = calendarEvents.value.findIndex(evento => evento.id === selectedEvent.value.id);
  if (eventoIndex !== -1) {
    calendarEvents.value[eventoIndex].masajista = selectedMasajista.value ? selectedMasajista.value.nombre : '';
    calendarEvents.value[eventoIndex].hora = hora.value || '';
  }
  actualizarEventos();
  showDialog.value = false;
};

// ✅ Eliminar evento
const eliminarEvento = (id) => {
  calendarEvents.value = calendarEvents.value.filter(evento => evento.id !== id);
  actualizarEventos();
  showDialog.value = false;
};

// ✅ Forzar actualización en Vue
const actualizarEventos = async () => {
  await nextTick();
  calendarOptions.value.events = [...calendarEvents.value];
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
