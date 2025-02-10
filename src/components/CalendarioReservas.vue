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
      <div class="p-field">
        <label for="descripcion">Descripción</label>
        <Textarea v-model="descripcion" placeholder="Agrega detalles sobre la cita..." rows="3" />
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
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';

// Generador de IDs únicos
const generateUniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

const showDialog = ref(false);
const selectedDate = ref(null);
const selectedCliente = ref({});
const selectedMasajista = ref(null);
const hora = ref(null);
const descripcion = ref('');
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
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  '18:00 - 19:00',

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
  eventResize: (info) => {
    info.revert();  // ❌ Siempre revertimos el cambio para que no se expanda
  },

  eventContent: renderEventContent,
  eventClick: (info) => {
    selectedEvent.value = calendarEvents.value.find(evento => evento.id === info.event.id);
    selectedCliente.value = { nombre: selectedEvent.value.cliente };
    selectedMasajista.value = masajistas.value.find(m => m.nombre === selectedEvent.value.masajista) || null;
    hora.value = selectedEvent.value.hora || null;
    descripcion.value = selectedEvent.value.descripcion || '';

    showDialog.value = true;
  },
  eventReceive: (info) => {
    selectedCliente.value = clientes.value.find(cliente => cliente.nombre === info.event.title);
    selectedDate.value = info.event.startStr;
    selectedEvent.value = {}; 
    descripcion.value = ''; 
    showDialog.value = true;

    info.event.remove(); 
  },
  eventDrop: (info) => {
    const evento = calendarEvents.value.find(e => e.id === info.event.id);
    if (!evento) return;

    const nuevaFecha = info.event.startStr;

    // ✅ Validar si el masajista ya tiene una cita en esa fecha y hora
    if (estaMasajistaOcupado(evento.masajista, nuevaFecha, evento.hora, evento.id)) {
      alert(`El masajista ${evento.masajista} ya tiene una cita a las ${evento.hora}. No se puede mover.`);
      info.revert(); // ❌ Volver a la posición original
    } else {
      evento.start = nuevaFecha; // ✅ Permitir el cambio si está libre
      actualizarEventos();
    }
  }
});

function renderEventContent(arg) {
  const event = calendarEvents.value.find(e => e.id === arg.event.id);
  if (!event) return { domNodes: [] };

  const estado = determinarEstado(event);
  const colores = {
    'Creado': '#FFD700',
    'Confirmado': '#1E90FF',
    'En Proceso': '#32CD32',
    'Finalizado': '#A9A9A9'
  };

  let container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.fontSize = "12px";
  container.style.padding = "5px";
  container.style.borderRadius = '5px';
  container.style.backgroundColor = colores[estado];
  container.style.color = 'white';

  let hora = document.createElement("strong");
  hora.innerText = event.hora || 'Hora no asignada';

  let descripcion = document.createElement("span");
  descripcion.innerText = event.descripcion || 'Sin descripción';

  let masajista = document.createElement("span");
  masajista.innerText = `Masajista: ${event.masajista || 'Sin asignar'}`;

  let cliente = document.createElement("span");
  cliente.innerText = `Cliente: ${event.cliente}`;

  const estadoEl = document.createElement('span');
  estadoEl.innerText = `Estado: ${estado}`;
  estadoEl.style.fontWeight = 'bold';

  container.appendChild(hora);
  container.appendChild(descripcion);
  container.appendChild(masajista);
  container.appendChild(cliente);
  container.appendChild(estadoEl);

  return { domNodes: [container] };
}

// 📌 Función para determinar el estado de la cita basado en la hora actual
function determinarEstado(event) {
  const ahora = new Date(); // Hora actual
  const fechaEvento = new Date(event.start); // Fecha del evento

  // Extraemos hora de inicio y fin del rango
  const [horaInicio, horaFin] = event.hora.split(' - ');

  // Convertimos hora de inicio a Date
  const [inicioHoras, inicioMinutos] = horaInicio.split(':').map(Number);
  const fechaInicio = new Date(fechaEvento);
  fechaInicio.setHours(inicioHoras, inicioMinutos, 0, 0);  // Aseguramos que los milisegundos estén en 0

  // Convertimos hora de fin a Date
  const [finHoras, finMinutos] = horaFin.split(':').map(Number);
  const fechaFin = new Date(fechaEvento);
  fechaFin.setHours(finHoras, finMinutos, 0, 0);


const ahoraUTC = new Date(ahora.toLocaleString('en-US', { timeZone: 'UTC' }));
console.log("Hora en UTC:", ahoraUTC.toISOString());


  // 📌 Determinamos el estado según la hora actual
  if (ahora < fechaInicio) {
    return 'Confirmado';  // La cita aún no ha comenzado
  } else if (ahora >= fechaInicio && ahora <= fechaFin) {
    return 'En Proceso';  // La cita está ocurriendo
  } else {
    return 'Finalizado';  // La cita ya terminó
  }
}

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

// ✅ Validar si el masajista ya tiene una cita en la misma fecha y hora
const estaMasajistaOcupado = (masajista, fecha, hora, eventoId = null) => {
  return calendarEvents.value.some(evento => 
    evento.masajista === masajista &&
    evento.start === fecha &&
    evento.hora === hora &&
    evento.id !== eventoId // Para que no bloquee la misma cita que se está editando
  );
};

// ✅ Crear nueva cita con validación
const agendarCita = () => {
  if (!selectedMasajista.value || !hora.value) {
    alert('Por favor, completa todos los campos.');
    return;
  }
  const fechaEvento = new Date(selectedDate.value);
  const [horaInicio] = hora.value.split(' - ');
  const [horas, minutos] = horaInicio.split(':').map(Number);
  fechaEvento.setHours(horas, minutos, 0, 0);

  // Validamos si el masajista ya tiene una cita en esa fecha y hora
  if (estaMasajistaOcupado(selectedMasajista.value.nombre, selectedDate.value, hora.value)) {
    alert(`El masajista ${selectedMasajista.value.nombre} ya tiene una cita a las ${hora.value}. Por favor, selecciona otra hora.`);
    return;
  }

  const nuevaCita = {
    id: generateUniqueId(),
    cliente: selectedCliente.value.nombre,
    title: `Cita con ${selectedCliente.value.nombre}`,
    start: fechaEvento,
    masajista: selectedMasajista.value.nombre,
    hora: hora.value,
    descripcion: descripcion.value,
    editable: true,
    allDay: false  // 📌 Aseguramos que no sea evento de todo el día
  };

  calendarEvents.value = [...calendarEvents.value, nuevaCita];
  actualizarEventos();
  showDialog.value = false;
};

// ✅ Guardar edición del evento con validación
const guardarEdicion = () => {
  const eventoIndex = calendarEvents.value.findIndex(evento => evento.id === selectedEvent.value.id);
  if (eventoIndex !== -1) {
    // Validar si el masajista ya tiene una cita a esa hora (excepto en la misma reserva)
    if (estaMasajistaOcupado(selectedMasajista.value.nombre, selectedEvent.value.start, hora.value, selectedEvent.value.id)) {
      alert(`El masajista ${selectedMasajista.value.nombre} ya tiene una cita a las ${hora.value}. Por favor, selecciona otra hora.`);
      return;
    }
    calendarEvents.value[eventoIndex].masajista = selectedMasajista.value ? selectedMasajista.value.nombre : 'Sin asignar';
    calendarEvents.value[eventoIndex].hora = hora.value || '';
    calendarEvents.value[eventoIndex].descripcion = descripcion.value || 'Sin descripción';
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

.fc-event-resizable .fc-resizer {
  display: none !important;
}

.fc-event {
  border: none !important;  /* Elimina cualquier borde */
  box-shadow: none !important;  /* Quita la sombra si hay alguna */
}



</style>
