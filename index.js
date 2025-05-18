// Backend para o sistema de sorteio de times
// Adaptado para Vercel API Routes

const fs = require('fs');
const path = require('path');

// Senha de administrador
const ADMIN_PASSWORD = 'admin123';

// Caminho para o arquivo de dados
const DATA_FILE = path.join('/tmp', 'sorteio-times-data.json');

// Função para ler os dados
function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } else {
      // Se o arquivo não existir, criar dados iniciais
      const initialData = {
        timeRenan: Array(7).fill(''),
        timeCristiano: Array(7).fill(''),
        timeElton: Array(7).fill('')
      };
      // Salvar os dados iniciais
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
  } catch (error) {
    console.error('Erro ao ler dados:', error);
    // Retornar dados padrão em caso de erro
    return {
      timeRenan: Array(7).fill(''),
      timeCristiano: Array(7).fill(''),
      timeElton: Array(7).fill('')
    };
  }
}

// Função para escrever os dados
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Erro ao escrever dados:', error);
    return false;
  }
}

// Middleware para verificar senha de administrador
function checkAdminPassword(adminPassword) {
  return adminPassword === ADMIN_PASSWORD;
}

// Handler principal para API Routes do Vercel
module.exports = async (req, res) => {
  // Configurar CORS para permitir acesso de qualquer origem
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Lidar com requisições OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'CORS preflight successful' });
  }

  // Extrair o caminho da API da URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const endpoint = pathname === '/api' ? '/' : pathname.replace('/api', '');

  console.log(`Requisição recebida: ${req.method} ${endpoint}`);

  try {
    // Obter os times (GET /)
    if (req.method === 'GET' && (endpoint === '/' || endpoint === '')) {
      const data = readData();
      
      return res.status(200).json({
        timeRenan: data.timeRenan,
        timeCristiano: data.timeCristiano,
        timeElton: data.timeElton
      });
    }

    // Processar requisições POST
    if (req.method === 'POST') {
      const body = req.body;
      
      // Sortear jogador (público) - POST /sortear-jogador
      if (endpoint === '/sortear-jogador') {
        const { nome, tipoSorteio } = body;
        
        if (!nome) {
          return res.status(400).json({ 
            status: 'error', 
            message: 'Nome do jogador é obrigatório' 
          });
        }
        
        const data = readData();
        
        // Verificar se o nome já está em algum time
        const todosJogadores = [
          ...data.timeRenan,
          ...data.timeCristiano,
          ...data.timeElton
        ].filter(Boolean);
        
        if (todosJogadores.includes(nome)) {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Este nome já está em um time.' 
          });
        }
        
        // Contar jogadores em cada time
        const countRenan = data.timeRenan.filter(Boolean).length;
        const countCristiano = data.timeCristiano.filter(Boolean).length;
        const countElton = data.timeElton.filter(Boolean).length;
        
        // Verificar se todos os times estão cheios
        if (countRenan >= 7 && countCristiano >= 7 && countElton >= 7) {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Todos os times já estão completos (7 jogadores cada).' 
          });
        }
        
        // Determinar qual time receberá o jogador
        let timeSorteado;
        
        if (tipoSorteio === "aleatorio") {
          // Priorizar times com menos jogadores para manter o equilíbrio
          const timesDisponiveis = [];
          
          if (countRenan < 7) timesDisponiveis.push("Renan");
          if (countCristiano < 7) timesDisponiveis.push("Cristiano");
          if (countElton < 7) timesDisponiveis.push("Elton");
          
          // Sortear entre os times disponíveis
          const randomIndex = Math.floor(Math.random() * timesDisponiveis.length);
          timeSorteado = timesDisponiveis[randomIndex];
        } else {
          // Usar o time especificado
          timeSorteado = tipoSorteio;
          
          // Verificar se o time escolhido está cheio
          if (timeSorteado === "Renan" && countRenan >= 7) {
            return res.status(200).json({ 
              status: 'error', 
              message: 'Time Renan já está completo (7 jogadores).' 
            });
          } else if (timeSorteado === "Cristiano" && countCristiano >= 7) {
            return res.status(200).json({ 
              status: 'error', 
              message: 'Time Cristiano já está completo (7 jogadores).' 
            });
          } else if (timeSorteado === "Elton" && countElton >= 7) {
            return res.status(200).json({ 
              status: 'error', 
              message: 'Time Elton já está completo (7 jogadores).' 
            });
          }
        }
        
        // Adicionar o jogador ao time sorteado
        let adicionado = false;
        
        if (timeSorteado === "Renan") {
          const index = data.timeRenan.findIndex(item => !item);
          if (index !== -1) {
            data.timeRenan[index] = nome;
            adicionado = true;
          }
        } else if (timeSorteado === "Cristiano") {
          const index = data.timeCristiano.findIndex(item => !item);
          if (index !== -1) {
            data.timeCristiano[index] = nome;
            adicionado = true;
          }
        } else if (timeSorteado === "Elton") {
          const index = data.timeElton.findIndex(item => !item);
          if (index !== -1) {
            data.timeElton[index] = nome;
            adicionado = true;
          }
        }
        
        // Se não conseguiu adicionar ao time sorteado, tentar outro time
        if (!adicionado) {
          if (countRenan < 7) {
            const index = data.timeRenan.findIndex(item => !item);
            if (index !== -1) {
              data.timeRenan[index] = nome;
              timeSorteado = "Renan";
              adicionado = true;
            }
          } else if (countCristiano < 7) {
            const index = data.timeCristiano.findIndex(item => !item);
            if (index !== -1) {
              data.timeCristiano[index] = nome;
              timeSorteado = "Cristiano";
              adicionado = true;
            }
          } else if (countElton < 7) {
            const index = data.timeElton.findIndex(item => !item);
            if (index !== -1) {
              data.timeElton[index] = nome;
              timeSorteado = "Elton";
              adicionado = true;
            }
          }
        }
        
        if (!adicionado) {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Não foi possível adicionar o jogador a nenhum time.' 
          });
        }
        
        // Salvar os dados
        if (writeData(data)) {
          return res.status(200).json({ 
            status: 'success', 
            time: timeSorteado,
            message: 'Jogador adicionado com sucesso ao time ' + timeSorteado 
          });
        } else {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Erro ao salvar os dados.' 
          });
        }
      }
      
      // Adicionar jogador (apenas admin) - POST /adicionar-jogador
      if (endpoint === '/adicionar-jogador') {
        const { nome, time, adminPassword } = body;
        
        // Verificar senha de administrador
        if (!checkAdminPassword(adminPassword)) {
          return res.status(403).json({
            status: 'error',
            message: 'Acesso negado. Senha de administrador incorreta.'
          });
        }
        
        if (!nome || !time) {
          return res.status(400).json({ 
            status: 'error', 
            message: 'Nome e time são obrigatórios' 
          });
        }
        
        const data = readData();
        
        // Verificar se o nome já está em algum time
        const todosJogadores = [
          ...data.timeRenan,
          ...data.timeCristiano,
          ...data.timeElton
        ].filter(Boolean);
        
        if (todosJogadores.includes(nome)) {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Este nome já está em um time.' 
          });
        }
        
        // Adicionar o jogador ao time escolhido
        let adicionado = false;
        
        if (time === "Renan") {
          const index = data.timeRenan.findIndex(item => !item);
          if (index !== -1) {
            data.timeRenan[index] = nome;
            adicionado = true;
          } else {
            return res.status(200).json({ 
              status: 'error', 
              message: 'Time Renan já está completo (7 jogadores).' 
            });
          }
        } else if (time === "Cristiano") {
          const index = data.timeCristiano.findIndex(item => !item);
          if (index !== -1) {
            data.timeCristiano[index] = nome;
            adicionado = true;
          } else {
            return res.status(200).json({ 
              status: 'error', 
              message: 'Time Cristiano já está completo (7 jogadores).' 
            });
          }
        } else if (time === "Elton") {
          const index = data.timeElton.findIndex(item => !item);
          if (index !== -1) {
            data.timeElton[index] = nome;
            adicionado = true;
          } else {
            return res.status(200).json({ 
              status: 'error', 
              message: 'Time Elton já está completo (7 jogadores).' 
            });
          }
        } else {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Time inválido.' 
          });
        }
        
        // Salvar os dados
        if (writeData(data)) {
          return res.status(200).json({ 
            status: 'success', 
            message: 'Jogador adicionado com sucesso ao time ' + time 
          });
        } else {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Erro ao salvar os dados.' 
          });
        }
      }
      
      // Editar jogador (apenas admin) - POST /editar-jogador
      if (endpoint === '/editar-jogador') {
        const { time, index, novoNome, adminPassword } = body;
        
        // Verificar senha de administrador
        if (!checkAdminPassword(adminPassword)) {
          return res.status(403).json({
            status: 'error',
            message: 'Acesso negado. Senha de administrador incorreta.'
          });
        }
        
        if (!time || index === undefined || !novoNome) {
          return res.status(400).json({ 
            status: 'error', 
            message: 'Time, índice e novo nome são obrigatórios' 
          });
        }
        
        const data = readData();
        
        // Verificar se o nome já está em uso em outro lugar
        const todosJogadores = [
          ...data.timeRenan,
          ...data.timeCristiano,
          ...data.timeElton
        ].filter(Boolean);
        
        // Remover o jogador atual da lista para não conflitar consigo mesmo
        let jogadorAtual = '';
        if (time === 'Renan' && data.timeRenan[index]) {
          jogadorAtual = data.timeRenan[index];
        } else if (time === 'Cristiano' && data.timeCristiano[index]) {
          jogadorAtual = data.timeCristiano[index];
        } else if (time === 'Elton' && data.timeElton[index]) {
          jogadorAtual = data.timeElton[index];
        }
        
        const jogadoresExcetoAtual = todosJogadores.filter(j => j !== jogadorAtual);
        
        if (jogadoresExcetoAtual.includes(novoNome)) {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Este nome já está em uso por outro jogador.' 
          });
        }
        
        // Atualizar o nome do jogador
        if (time === 'Renan') {
          if (index >= 0 && index < data.timeRenan.length) {
            data.timeRenan[index] = novoNome;
          } else {
            return res.status(200).json({ 
              status: 'error', 
              message: 'Índice inválido para o Time Renan.' 
            });
          }
        } else if (time === 'Cristiano') {
          if (index >= 0 && index < data.timeCristiano.length) {
            data.timeCristiano[index] = novoNome;
          } else {
            return res.status(200).json({ 
              status: 'error', 
              message: 'Índice inválido para o Time Cristiano.' 
            });
          }
        } else if (time === 'Elton') {
          if (index >= 0 && index < data.timeElton.length) {
            data.timeElton[index] = novoNome;
          } else {
            return res.status(200).json({ 
              status: 'error', 
              message: 'Índice inválido para o Time Elton.' 
            });
          }
        } else {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Time inválido.' 
          });
        }
        
        // Salvar os dados
        if (writeData(data)) {
          return res.status(200).json({ 
            status: 'success', 
            message: 'Nome do jogador atualizado com sucesso.' 
          });
        } else {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Erro ao salvar os dados.' 
          });
        }
      }
      
      // Remover jogador (apenas admin) - POST /remover-jogador
      if (endpoint === '/remover-jogador') {
        const { time, index, adminPassword } = body;
        
        // Verificar senha de administrador
        if (!checkAdminPassword(adminPassword)) {
          return res.status(403).json({
            status: 'error',
            message: 'Acesso negado. Senha de administrador incorreta.'
          });
        }
        
        if (!time || index === undefined) {
          return res.status(400).json({ 
            status: 'error', 
            message: 'Time e índice são obrigatórios' 
          });
        }
        
        const data = readData();
        
        // Remover o jogador
        if (time === 'Renan') {
          if (index >= 0 && index < data.timeRenan.length && data.timeRenan[index]) {
            data.timeRenan[index] = '';
          } else {
            return res.status(200).json({ 
              status: 'error', 
              message: 'Jogador não encontrado no Time Renan.' 
            });
          }
        } else if (time === 'Cristiano') {
          if (index >= 0 && index < data.timeCristiano.length && data.timeCristiano[index]) {
            data.timeCristiano[index] = '';
          } else {
            return res.status(200).json({ 
              status: 'error', 
              message: 'Jogador não encontrado no Time Cristiano.' 
            });
          }
        } else if (time === 'Elton') {
          if (index >= 0 && index < data.timeElton.length && data.timeElton[index]) {
            data.timeElton[index] = '';
          } else {
            return res.status(200).json({ 
              status: 'error', 
              message: 'Jogador não encontrado no Time Elton.' 
            });
          }
        } else {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Time inválido.' 
          });
        }
        
        // Salvar os dados
        if (writeData(data)) {
          return res.status(200).json({ 
            status: 'success', 
            message: 'Jogador removido com sucesso.' 
          });
        } else {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Erro ao salvar os dados.' 
          });
        }
      }
      
      // Limpar todos os times (apenas admin) - POST /limpar-times
      if (endpoint === '/limpar-times') {
        const { adminPassword } = body;
        
        // Verificar senha de administrador
        if (!checkAdminPassword(adminPassword)) {
          return res.status(403).json({
            status: 'error',
            message: 'Acesso negado. Senha de administrador incorreta.'
          });
        }
        
        const data = {
          timeRenan: Array(7).fill(''),
          timeCristiano: Array(7).fill(''),
          timeElton: Array(7).fill('')
        };
        
        // Salvar os dados
        if (writeData(data)) {
          return res.status(200).json({ 
            status: 'success', 
            message: 'Todos os times foram limpos com sucesso.' 
          });
        } else {
          return res.status(200).json({ 
            status: 'error', 
            message: 'Erro ao limpar os times.' 
          });
        }
      }
    }
    
    // Rota não encontrada
    return res.status(404).json({ 
      status: 'error', 
      message: 'Rota não encontrada: ' + endpoint
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Erro interno do servidor: ' + error.message
    });
  }
};
