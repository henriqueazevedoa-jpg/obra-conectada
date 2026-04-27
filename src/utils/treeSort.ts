import { OrcamentoEtapa, OrcamentoComposicao } from '@/contexts/OrcamentoContext';

export interface FlatItem {
  id: string;
  item: OrcamentoEtapa | OrcamentoComposicao;
  depth: number;
  parentId: string | null;
}

export function flattenTree(
  items: Array<OrcamentoEtapa | OrcamentoComposicao>,
  depth: number = 1,
  parentId: string | null = null
): FlatItem[] {
  let result: FlatItem[] = [];

  for (const item of items) {
    result.push({
      id: item.id,
      item,
      depth,
      parentId,
    });

    if (item.tipo === 'etapa' && item.items && item.items.length > 0) {
      result = result.concat(flattenTree(item.items, depth + 1, item.id));
    }
  }

  return result;
}

export function buildTree(flatItems: FlatItem[]): Array<OrcamentoEtapa | OrcamentoComposicao> {
  const rootItems: Array<OrcamentoEtapa | OrcamentoComposicao> = [];
  const map = new Map<string, OrcamentoEtapa>();

  // Primeiro passo: instanciar todas as etapas com items vazios
  for (const flat of flatItems) {
    if (flat.item.tipo === 'etapa') {
      const clone = { ...flat.item, items: [] } as OrcamentoEtapa;
      map.set(flat.id, clone);
    }
  }

  // Segundo passo: linkar filhos aos pais baseando no flatItems (que dita a ordem real)
  for (const flat of flatItems) {
    let itemToInsert: OrcamentoEtapa | OrcamentoComposicao;
    if (flat.item.tipo === 'etapa') {
      itemToInsert = map.get(flat.id)!;
    } else {
      itemToInsert = { ...flat.item } as OrcamentoComposicao;
    }

    if (flat.parentId && map.has(flat.parentId)) {
      map.get(flat.parentId)!.items.push(itemToInsert);
    } else {
      rootItems.push(itemToInsert);
    }
  }

  return rootItems;
}

export function getVisibleItems(flatItems: FlatItem[], collapsedIds: Set<string>): FlatItem[] {
  const visible: FlatItem[] = [];
  let skippingDepth = Infinity;
  
  for (const flat of flatItems) {
    if (flat.depth > skippingDepth) continue;
    skippingDepth = Infinity;
    
    visible.push(flat);
    
    if (flat.item.tipo === 'etapa' && collapsedIds.has(flat.id)) {
      skippingDepth = flat.depth;
    }
  }
  
  return visible;
}

export function moveItem(
  flatItems: FlatItem[],
  activeId: string,
  overId: string,
  targetDepth: number
): FlatItem[] {
  const oldIndex = flatItems.findIndex(i => i.id === activeId);
  if (oldIndex === -1) return flatItems;

  const activeItem = flatItems[oldIndex];

  // Encontrar bloco inteiro (item + todos os seus descendentes)
  const block: FlatItem[] = [activeItem];
  let endIndex = oldIndex + 1;
  while (endIndex < flatItems.length && flatItems[endIndex].depth > activeItem.depth) {
    block.push(flatItems[endIndex]);
    endIndex++;
  }

  // Remover bloco da lista
  const nextItems = [...flatItems.slice(0, oldIndex), ...flatItems.slice(endIndex)];

  // Achar novo índice
  let newIndex = nextItems.findIndex(i => i.id === overId);
  if (newIndex === -1) return flatItems;

  // Ajustar o index se estivermos movendo "para baixo"
  // Na verdade, dnd-kit `arrayMove` usa a lógica onde se vc move para baixo, o overId é empurrado pra cima
  const overItem = nextItems[newIndex];
  
  // Calcular diferença de profundidade para aplicar em todos do bloco
  const depthDiff = targetDepth - activeItem.depth;
  
  // Determinar novo parentId
  let newParentId: string | null = null;
  if (targetDepth > 1) {
    // Procurar para trás a partir do newIndex pelo primeiro item com profundidade == targetDepth - 1
    for (let i = newIndex; i >= 0; i--) {
      if (nextItems[i].depth === targetDepth - 1 && nextItems[i].item.tipo === 'etapa') {
        newParentId = nextItems[i].id;
        break;
      }
    }
  }

  // Se a gente tá inserindo em uma profundidade, ele DEVE ir depois da etapa pai, e depois dos filhos já existentes
  // Mas a interface visual diz que estamos inserindo *antes* ou *depois* do overId.
  // Vamos inserir no `newIndex` (ou `newIndex + 1` dependendo da heurística do dnd-kit, geralmente é no próprio newIndex)
  
  // Ajustar bloco com novas profundidades
  const adjustedBlock = block.map((b, i) => {
    if (i === 0) {
      return { ...b, depth: targetDepth, parentId: newParentId };
    }
    // Descendentes seguem a diferença de profundidade, mas o parentId deles permanece consistente entre si
    return { ...b, depth: b.depth + depthDiff };
  });

  nextItems.splice(newIndex, 0, ...adjustedBlock);

  return nextItems;
}
