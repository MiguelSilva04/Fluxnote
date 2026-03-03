/**
 * Lista curada de cidades para o autocomplete do campo Location.
 * Formato: "Cidade, País"
 * Inclui todos os municípios portugueses + principais cidades internacionais.
 */

const PORTUGAL: string[] = [
  'Abrantes, Portugal', 'Águeda, Portugal', 'Albufeira, Portugal', 'Alcácer do Sal, Portugal',
  'Alcochete, Portugal', 'Alenquer, Portugal', 'Almada, Portugal', 'Almeirim, Portugal',
  'Almodôvar, Portugal', 'Alpiarça, Portugal', 'Amadora, Portugal', 'Amarante, Portugal',
  'Amares, Portugal', 'Anadia, Portugal', 'Arcos de Valdevez, Portugal', 'Arganil, Portugal',
  'Arraiolos, Portugal', 'Arruda dos Vinhos, Portugal', 'Aveiro, Portugal', 'Azambuja, Portugal',
  'Baião, Portugal', 'Barcelos, Portugal', 'Barreiro, Portugal', 'Batalha, Portugal',
  'Beja, Portugal', 'Belmonte, Portugal', 'Benavente, Portugal', 'Bombarral, Portugal',
  'Braga, Portugal', 'Bragança, Portugal', 'Caldas da Rainha, Portugal', 'Caminha, Portugal',
  'Cantanhede, Portugal', 'Cascais, Portugal', 'Castelo Branco, Portugal',
  'Castelo de Vide, Portugal', 'Castro Verde, Portugal', 'Chaves, Portugal', 'Coimbra, Portugal',
  'Condeixa-a-Nova, Portugal', 'Covilhã, Portugal', 'Elvas, Portugal', 'Entroncamento, Portugal',
  'Espinho, Portugal', 'Esposende, Portugal', 'Estremoz, Portugal', 'Évora, Portugal',
  'Fafe, Portugal', 'Faro, Portugal', 'Felgueiras, Portugal', 'Figueira da Foz, Portugal',
  'Funchal, Portugal', 'Fundão, Portugal', 'Gondomar, Portugal', 'Grândola, Portugal',
  'Guarda, Portugal', 'Guimarães, Portugal', 'Ílhavo, Portugal', 'Lagos, Portugal',
  'Lamego, Portugal', 'Leiria, Portugal', 'Lisboa, Portugal', 'Loulé, Portugal',
  'Lousã, Portugal', 'Lousada, Portugal', 'Mafra, Portugal', 'Maia, Portugal',
  'Marco de Canaveses, Portugal', 'Marinha Grande, Portugal', 'Matosinhos, Portugal',
  'Mirandela, Portugal', 'Moita, Portugal', 'Monção, Portugal', 'Monchique, Portugal',
  'Montijo, Portugal', 'Moura, Portugal', 'Nazaré, Portugal', 'Odivelas, Portugal',
  'Oeiras, Portugal', 'Olhão, Portugal', 'Oliveira de Azeméis, Portugal',
  'Ourém, Portugal', 'Ovar, Portugal', 'Paços de Ferreira, Portugal', 'Palmela, Portugal',
  'Paredes, Portugal', 'Penafiel, Portugal', 'Peniche, Portugal', 'Peso da Régua, Portugal',
  'Pombal, Portugal', 'Ponte de Lima, Portugal', 'Portalegre, Portugal', 'Portimão, Portugal',
  'Porto, Portugal', 'Póvoa de Varzim, Portugal', 'Rio Maior, Portugal',
  'Santa Maria da Feira, Portugal', 'Santarém, Portugal', 'Santiago do Cacém, Portugal',
  'Santo Tirso, Portugal', 'São João da Madeira, Portugal', 'Seia, Portugal',
  'Seixal, Portugal', 'Serpa, Portugal', 'Sesimbra, Portugal', 'Setúbal, Portugal',
  'Silves, Portugal', 'Sines, Portugal', 'Sintra, Portugal', 'Tavira, Portugal',
  'Tomar, Portugal', 'Torres Novas, Portugal', 'Torres Vedras, Portugal', 'Trofa, Portugal',
  'Valença, Portugal', 'Valongo, Portugal', 'Viana do Castelo, Portugal',
  'Vila do Conde, Portugal', 'Vila Franca de Xira, Portugal',
  'Vila Nova de Famalicão, Portugal', 'Vila Nova de Gaia, Portugal',
  'Vila Real, Portugal', 'Vila Real de Santo António, Portugal', 'Vila Verde, Portugal',
  'Viseu, Portugal',
];

const BRAZIL: string[] = [
  'Belo Horizonte, Brasil', 'Belém, Brasil', 'Brasília, Brasil', 'Campinas, Brasil',
  'Campo Grande, Brasil', 'Cuiabá, Brasil', 'Curitiba, Brasil', 'Florianópolis, Brasil',
  'Fortaleza, Brasil', 'Goiânia, Brasil', 'João Pessoa, Brasil', 'Macapá, Brasil',
  'Maceió, Brasil', 'Manaus, Brasil', 'Natal, Brasil', 'Porto Alegre, Brasil',
  'Porto Velho, Brasil', 'Recife, Brasil', 'Rio Branco, Brasil', 'Rio de Janeiro, Brasil',
  'Salvador, Brasil', 'São Luís, Brasil', 'São Paulo, Brasil', 'Teresina, Brasil',
  'Vitória, Brasil',
];

const SPAIN: string[] = [
  'Alicante, Espanha', 'Almeria, Espanha', 'Badajoz, Espanha', 'Barcelona, Espanha',
  'Bilbao, Espanha', 'Cádiz, Espanha', 'Córdoba, Espanha', 'Granada, Espanha',
  'Las Palmas, Espanha', 'Madrid, Espanha', 'Málaga, Espanha', 'Murcia, Espanha',
  'Palma, Espanha', 'Salamanca, Espanha', 'San Sebastián, Espanha',
  'Santander, Espanha', 'Santiago de Compostela, Espanha', 'Sevilha, Espanha',
  'Valência, Espanha', 'Valladolid, Espanha', 'Vigo, Espanha', 'Zaragoza, Espanha',
];

const UK: string[] = [
  'Belfast, Reino Unido', 'Birmingham, Reino Unido', 'Bristol, Reino Unido',
  'Cardiff, Reino Unido', 'Edinburgh, Reino Unido', 'Glasgow, Reino Unido',
  'Leeds, Reino Unido', 'Liverpool, Reino Unido', 'Londres, Reino Unido',
  'Manchester, Reino Unido', 'Newcastle, Reino Unido', 'Nottingham, Reino Unido',
  'Oxford, Reino Unido', 'Sheffield, Reino Unido',
];

const FRANCE: string[] = [
  'Bordeaux, França', 'Lille, França', 'Lyon, França', 'Marselha, França',
  'Montpellier, França', 'Nantes, França', 'Nice, França', 'Paris, França',
  'Rennes, França', 'Strasbourg, França', 'Toulouse, França',
];

const GERMANY: string[] = [
  'Berlim, Alemanha', 'Colónia, Alemanha', 'Dortmund, Alemanha', 'Dresden, Alemanha',
  'Düsseldorf, Alemanha', 'Essen, Alemanha', 'Frankfurt, Alemanha', 'Hamburgo, Alemanha',
  'Hanôver, Alemanha', 'Munique, Alemanha', 'Estugarda, Alemanha',
];

const USA: string[] = [
  'Atlanta, Estados Unidos', 'Austin, Estados Unidos', 'Boston, Estados Unidos',
  'Charlotte, Estados Unidos', 'Chicago, Estados Unidos', 'Dallas, Estados Unidos',
  'Denver, Estados Unidos', 'Detroit, Estados Unidos', 'Houston, Estados Unidos',
  'Las Vegas, Estados Unidos', 'Los Angeles, Estados Unidos', 'Miami, Estados Unidos',
  'Minneapolis, Estados Unidos', 'Nashville, Estados Unidos', 'Nova Iorque, Estados Unidos',
  'Orlando, Estados Unidos', 'Philadelphia, Estados Unidos', 'Phoenix, Estados Unidos',
  'Portland, Estados Unidos', 'San Diego, Estados Unidos', 'San Francisco, Estados Unidos',
  'Seattle, Estados Unidos', 'Washington, Estados Unidos',
];

const OTHER: string[] = [
  // Europa
  'Amesterdão, Países Baixos', 'Atenas, Grécia', 'Bruxelas, Bélgica',
  'Bucareste, Roménia', 'Budapeste, Hungria', 'Copenhaga, Dinamarca',
  'Dublin, Irlanda', 'Helsínquia, Finlândia', 'Istambul, Turquia',
  'Lisboa, Portugal', 'Ljubljana, Eslovénia', 'Luxemburgo, Luxemburgo',
  'Madrid, Espanha', 'Milão, Itália', 'Moscovo, Rússia',
  'Oslo, Noruega', 'Praga, República Checa', 'Roma, Itália',
  'Roterdão, Países Baixos', 'Sarajevo, Bósnia', 'Skopje, Macedónia do Norte',
  'Sófia, Bulgária', 'Estocolmo, Suécia', 'Tallinn, Estónia',
  'Varsóvia, Polónia', 'Viena, Áustria', 'Vilnius, Lituânia', 'Zurique, Suíça',
  // Ásia
  'Bangalore, Índia', 'Banguecoque, Tailândia', 'Beirute, Líbano',
  'Cidade de Ho Chi Minh, Vietname', 'Dubai, Emirados Árabes',
  'Hanói, Vietname', 'Hong Kong, China', 'Jacarta, Indonésia',
  'Karachi, Paquistão', 'Kuala Lumpur, Malásia', 'Mumbai, Índia',
  'Nova Delhi, Índia', 'Osaka, Japão', 'Paquim, China',
  'Riade, Arábia Saudita', 'Seul, Coreia do Sul', 'Singapura, Singapura',
  'Tóquio, Japão', 'Tel Aviv, Israel',
  // África
  'Abidjan, Costa do Marfim', 'Acra, Gana', 'Adis Abeba, Etiópia',
  'Cairo, Egito', 'Cidade do Cabo, África do Sul', 'Dacar, Senegal',
  'Joanesburgo, África do Sul', 'Lagos, Nigéria', 'Luanda, Angola',
  'Maputo, Moçambique', 'Nairobi, Quénia', 'Tunes, Tunísia',
  // América
  'Buenos Aires, Argentina', 'Bogotá, Colômbia', 'Cidade do México, México',
  'Lima, Peru', 'Montreal, Canadá', 'Ottawa, Canadá', 'Santiago, Chile',
  'Toronto, Canadá', 'Vancouver, Canadá',
  // Oceânia
  'Auckland, Nova Zelândia', 'Brisbane, Austrália', 'Melbourne, Austrália',
  'Perth, Austrália', 'Sydney, Austrália',
];

export const CITIES: string[] = [
  ...PORTUGAL,
  ...BRAZIL,
  ...SPAIN,
  ...UK,
  ...FRANCE,
  ...GERMANY,
  ...USA,
  ...OTHER,
].sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
