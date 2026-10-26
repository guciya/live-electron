import { request } from '../request';

/** 游戏列表项 */
export interface GameItem {
  game_id: string | number;
  game_title: string;
  game_icon?: string;
  game_room_id?: string;
  redirect_url: string;
  game_desc?: string;
  recommend_banner_image?: string;
}

/** 游戏列表返回结构 */
export interface GameListResult {
  game_list: GameItem[];
  recommend_game_info?: GameItem | null;
}

/** 获取游戏列表 */
export function getGameList(): Promise<GameListResult> {
  return request.post('/api/game/gameList', {}) as unknown as Promise<GameListResult>;
}
