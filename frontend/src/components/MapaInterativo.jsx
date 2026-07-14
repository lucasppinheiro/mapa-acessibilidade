import { useEffect } from 'react';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { CATEGORIAS } from '../constants';
import { coordenadasDe, idDe, mediaDe } from '../utils/domain';
import StarRating from './StarRating';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

function iconeDaNota(nota) {
  const numero = Number(nota);
  const arredondada = Number.isFinite(numero) ? Math.round(numero) : null;
  const cores = { 1: '#b91c1c', 2: '#c2410c', 3: '#a16207', 4: '#4d7c0f', 5: '#047857' };
  const cor = cores[arredondada] || '#334155';
  const texto = arredondada || '?';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<span class="map-marker" style="background-color:${cor}">${texto}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17]
  });
}

function nomearMarcador(event, rotulo, titulo) {
  const elemento = event.target.getElement();
  if (!elemento) return;
  elemento.setAttribute('aria-label', rotulo);
  elemento.setAttribute('title', titulo);
}

function SeletorNoMapa({ onLocationSelect }) {
  useMapEvents({
    click(event) {
      onLocationSelect?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  return null;
}

function CentralizarMapa({ centro }) {
  const map = useMap();

  useEffect(() => {
    if (centro) map.setView(centro, 16);
  }, [centro, map]);

  return null;
}

export default function MapaInterativo({
  locais = [],
  onLocationSelect,
  marcadorSelecionado,
  centroInicial,
  titulo = 'Mapa dos locais'
}) {
  const centro = centroInicial || (marcadorSelecionado
    ? [marcadorSelecionado.lat, marcadorSelecionado.lng]
    : [-23.5505, -46.6333]);

  return (
    <section className="h-full min-h-80 w-full" aria-label={titulo}>
      <p className="sr-only">
        O mapa é uma visualização complementar. As mesmas informações estão disponíveis na lista textual.
      </p>
      <MapContainer center={centro} zoom={13} className="h-full w-full rounded-xl" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CentralizarMapa centro={marcadorSelecionado ? [marcadorSelecionado.lat, marcadorSelecionado.lng] : centroInicial} />
        {onLocationSelect && <SeletorNoMapa onLocationSelect={onLocationSelect} />}

        {marcadorSelecionado && (
          <Marker
            position={[marcadorSelecionado.lat, marcadorSelecionado.lng]}
            title="Coordenadas selecionadas"
            alt="Marcador das coordenadas selecionadas"
            keyboard
            eventHandlers={{ add: (event) => nomearMarcador(event, 'Marcador das coordenadas selecionadas', 'Coordenadas selecionadas') }}
          >
            <Popup>
              <strong>Coordenadas selecionadas</strong>
              <br />
              {Number(marcadorSelecionado.lat).toFixed(6)}, {Number(marcadorSelecionado.lng).toFixed(6)}
            </Popup>
          </Marker>
        )}

        {locais.map((local) => {
          const coordenadas = coordenadasDe(local);
          if (!coordenadas) return null;
          const media = mediaDe(local);
          const identificador = idDe(local);
          return (
            <Marker
              key={identificador}
              position={[coordenadas.lat, coordenadas.lng]}
              icon={iconeDaNota(media)}
              title={local.nome}
              alt={`Marcador do local ${local.nome}`}
              keyboard
              eventHandlers={{ add: (event) => nomearMarcador(event, `Marcador do local ${local.nome}`, local.nome) }}
            >
              <Popup>
                <div className="min-w-52">
                  <h3 className="font-bold text-slate-900">
                    <span aria-hidden="true">{CATEGORIAS[local.categoria]?.emoji} </span>
                    {local.nome}
                  </h3>
                  <p className="mb-2 text-sm text-slate-700">{local.endereco}</p>
                  <StarRating nota={media} somenteLeitura tamanho="text-sm" />
                  <p className="mt-2 text-sm text-slate-600">{local.descricao}</p>
                  <Link className="mt-3 inline-block font-semibold text-blue-800 underline" to={`/local/${identificador}`}>
                    Ver detalhes de {local.nome}
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </section>
  );
}
