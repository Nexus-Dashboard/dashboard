// src/utils/regionMapping.js

// Mapeamento de estados por região do Brasil
export const STATES_BY_REGION = {
  'Norte': [
    'Acre', 'Amapá', 'Amazonas', 'Pará', 'Rondônia', 'Roraima', 'Tocantins'
  ],
  'Nordeste': [
    'Alagoas', 'Bahia', 'Ceará', 'Maranhão', 'Paraíba', 'Pernambuco', 
    'Piauí', 'Rio Grande do Norte', 'Sergipe'
  ],
  'Centro-Oeste': [
    'Distrito Federal', 'Goiás', 'Mato Grosso', 'Mato Grosso do Sul'
  ],
  'Sudeste': [
    'Espírito Santo', 'Minas Gerais', 'Rio de Janeiro', 'São Paulo'
  ],
  'Sul': [
    'Paraná', 'Rio Grande do Sul', 'Santa Catarina'
  ]
};

// Mapeamento inverso: estado -> região
export const REGION_BY_STATE = {};
Object.entries(STATES_BY_REGION).forEach(([region, states]) => {
  states.forEach(state => {
    REGION_BY_STATE[state] = region;
  });
});

// Função para obter estados de uma região
export const getStatesFromRegion = (region) => {
  return STATES_BY_REGION[region] || [];
};

// Função para obter região de um estado
export const getRegionFromState = (state) => {
  return REGION_BY_STATE[state] || null;
};

// Função para filtrar dados por região baseado nos estados
export const filterDataByRegion = (data, selectedRegions) => {
  if (!selectedRegions || selectedRegions.length === 0) {
    return data;
  }

  // Obter todos os estados das regiões selecionadas
  const targetStates = selectedRegions.flatMap(region => getStatesFromRegion(region));
  
  return data.filter(item => {
    const state = item.UF || item.uf;
    return targetStates.includes(state);
  });
};

// Função para verificar se um estado pertence às regiões selecionadas
export const isStateInSelectedRegions = (state, selectedRegions) => {
  if (!selectedRegions || selectedRegions.length === 0) {
    return true; // Se nenhuma região selecionada, incluir todos
  }
  
  const stateRegion = getRegionFromState(state);
  return selectedRegions.includes(stateRegion);
};

// Função para normalizar nomes de estados (útil para variações nos dados)
export const normalizeStateName = (stateName) => {
  if (!stateName) return null;
  
  const normalized = stateName.trim();
  
  // Mapeamento de possíveis variações de nomes
  const stateVariations = {
    'DF': 'Distrito Federal',
    'RJ': 'Rio de Janeiro',
    'SP': 'São Paulo',
    'MG': 'Minas Gerais',
    'ES': 'Espírito Santo',
    'PR': 'Paraná',
    'SC': 'Santa Catarina',
    'RS': 'Rio Grande do Sul',
    'MS': 'Mato Grosso do Sul',
    'MT': 'Mato Grosso',
    'GO': 'Goiás',
    'TO': 'Tocantins',
    'BA': 'Bahia',
    'SE': 'Sergipe',
    'AL': 'Alagoas',
    'PE': 'Pernambuco',
    'PB': 'Paraíba',
    'RN': 'Rio Grande do Norte',
    'CE': 'Ceará',
    'PI': 'Piauí',
    'MA': 'Maranhão',
    'PA': 'Pará',
    'AP': 'Amapá',
    'AM': 'Amazonas',
    'RR': 'Roraima',
    'AC': 'Acre',
    'RO': 'Rondônia'
  };
  
  // Se é uma sigla, converter para nome completo
  if (stateVariations[normalized]) {
    return stateVariations[normalized];
  }
  
  // Se já é um nome completo, retornar como está
  return normalized;
};

// Função para filtrar respostas do dashboard por região
export const filterDashboardDataByRegion = (roundsData, selectedRegions, ufDemographicKey = "UF") => {
  if (!selectedRegions || selectedRegions.length === 0) {
    return roundsData;
  }

  return roundsData.map(round => {
    let totalForFilter = 0;
    const distributionForFilter = {};

    round.distribution.forEach(dist => {
      const ufDemographics = dist.demographics?.[ufDemographicKey] || dist.demographics?.["PF10"];
      
      if (ufDemographics) {
        ufDemographics.forEach(ufDemo => {
          const stateName = normalizeStateName(ufDemo.response);
          if (isStateInSelectedRegions(stateName, selectedRegions)) {
            totalForFilter += ufDemo.weightedCount;
            distributionForFilter[dist.response] = 
              (distributionForFilter[dist.response] || 0) + ufDemo.weightedCount;
          }
        });
      }
    });

    const newDistribution = round.distribution.map(dist => ({
      ...dist,
      weightedCount: distributionForFilter[dist.response] || 0
    }));

    return {
      ...round,
      distribution: newDistribution,
      totalWeightedResponses: totalForFilter
    };
  });
};

// Função para obter lista de regiões disponíveis
export const getAvailableRegions = () => {
  return Object.keys(STATES_BY_REGION).sort();
};

// Função para validar se uma região existe
export const isValidRegion = (region) => {
  return Object.keys(STATES_BY_REGION).includes(region);
};

// Função para obter estatísticas por região
export const getRegionStats = (data, ufKey = "UF") => {
  const regionStats = {};
  
  Object.keys(STATES_BY_REGION).forEach(region => {
    regionStats[region] = {
      states: STATES_BY_REGION[region],
      count: 0,
      responses: []
    };
  });

  data.forEach(item => {
    const state = normalizeStateName(item[ufKey]);
    const region = getRegionFromState(state);
    
    if (region && regionStats[region]) {
      regionStats[region].count++;
      regionStats[region].responses.push(item);
    }
  });

  return regionStats;
};