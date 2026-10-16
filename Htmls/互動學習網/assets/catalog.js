/* =========================================================
 * 互動學習網｜課程目錄（唯一的課程清單來源）
 * ---------------------------------------------------------
 * 新增科目：在 subjects 陣列加入一筆，並建立同名資料夾與 index.html
 * 新增單元：在該科目的 units 加入一筆，status 設為 'ready'，
 *           並在科目資料夾下建立單元資料夾（index.html + data.js）
 * status：'ready' 已上線｜'soon' 製作中（顯示為灰色卡片）
 * ========================================================= */
window.HUB_CATALOG = {
  title: '互動學習網',
  subtitle: '課本＋習作重點整理・互動實驗・隨堂練習',
  subjects: [
    {
      id: 'sci5a',
      name: '自然五上',
      subject: '自然科學',
      grade: '五年級上學期',
      icon: '🔬',
      theme: 'mint',
      path: '自然五上/',
      status: 'ready',
      units: [
        {
          id: 'sci5a-u1', no: 1, title: '太陽的祕密', icon: '☀️',
          path: '單元1_太陽的祕密/', status: 'ready',
          sections: ['1-1 太陽與生活', '1-2 太陽的位置變化', '1-3 光的折射']
        },
        {
          id: 'sci5a-u2', no: 2, title: '千變萬化的植物', icon: '🌱',
          path: '單元2_千變萬化的植物/', status: 'ready',
          sections: ['2-1 不同環境的植物', '2-2 植物存活的本事', '2-3 植物繁衍大顯身手', '2-4 植物的特徵與分類']
        },
        {
          id: 'sci5a-u3', no: 3, title: '神奇的水溶液', icon: '🧪',
          path: '單元3_神奇的水溶液/', status: 'ready',
          sections: ['3-1 水溶液中的物質', '3-2 水溶液的酸鹼性', '3-3 水溶液的導電性']
        },
        {
          id: 'sci5a-u4', no: 4, title: '力與運動', icon: '🧲',
          path: '單元4_力與運動/', status: 'ready',
          sections: ['4-1 地球引力', '4-2 力的測量', '4-3 摩擦力']
        }
      ]
    },
    {
      id: 'soc5a', name: '社會五上', subject: '社會', grade: '五年級上學期',
      icon: '🗺️', theme: 'cream', path: '社會五上/', status: 'ready',
      units: [
        {
          id: 'soc5a-u1', no: 1, title: '臺灣的位置與先民足跡', icon: '🏝️',
          path: '單元1_臺灣的位置與先民足跡/', status: 'ready',
          sections: ['第1課 從地圖探索位置與發展有何關聯？', '第2課 史前人們如何善用資源維持生活？', '第3課 原住民族的文化與環境有何關聯？']
        },
        {
          id: 'soc5a-u2', no: 2, title: '臺灣登上國際舞臺', icon: '⛵',
          path: '單元2_臺灣登上國際舞臺/', status: 'ready',
          sections: ['第1課 臺灣為什麼在大航海時代崛起？', '第2課 大航海時代在臺灣留下哪些影響？']
        },
        {
          id: 'soc5a-u3', no: 3, title: '成為清帝國的領土', icon: '📜',
          path: '單元3_成為清帝國的領土/', status: 'ready',
          sections: ['第1課 早期移民如何在臺灣建立家園？', '第2課 開港通商為什麼改變了臺灣的發展？']
        },
        {
          id: 'soc5a-u4', no: 4, title: '土地的利用與變遷', icon: '🏞️',
          path: '單元4_土地的利用與變遷/', status: 'ready',
          sections: ['第1課 人們如何適應不同地形創造所需？', '第2課 沿海的利用為什麼呈現多元發展？', '第3課 土地開發與環境保護該如何抉擇？']
        }
      ]
    },
    {
      id: 'sci6a', name: '自然六上', subject: '自然科學', grade: '六年級上學期',
      icon: '🔭', theme: 'mint', path: '自然六上/', status: 'ready',
      units: [
        {
          id: 'sci6a-u1', no: 1, title: '熱的影響與傳播', icon: '🔥',
          path: '單元1_熱的影響與傳播/', status: 'ready',
          sections: ['1-1 物質的變化與組成', '1-2 熱的傳播', '1-3 保溫與散熱']
        },
        {
          id: 'sci6a-u2', no: 2, title: '多變的天氣', icon: '🌦️',
          path: '單元2_多變的天氣/', status: 'ready',
          sections: ['2-1 水與天氣的關係', '2-2 天氣圖與天氣變化', '2-3 颱風與防災']
        },
        { id: 'sci6a-u3', no: 3, title: '發現大地的奧祕', icon: '⛰️', path: '單元3_發現大地的奧祕/', status: 'soon', sections: [] },
        { id: 'sci6a-u4', no: 4, title: '電磁與生活', icon: '🧲', path: '單元4_電磁與生活/', status: 'soon', sections: [] }
      ]
    },
    {
      id: 'soc6a', name: '社會六上', subject: '社會', grade: '六年級上學期',
      icon: '🌏', theme: 'sky', path: '社會六上/', status: 'ready',
      units: [
        {
          id: 'soc6a-u1', no: 1, title: '消費選擇與理財規劃', icon: '💰',
          path: '單元1_消費選擇與理財規劃/', status: 'ready',
          sections: ['第1課 消費如何聰明選擇並守護權益？', '第2課 為什麼要理財規劃與評估風險？']
        },
        {
          id: 'soc6a-u2', no: 2, title: '戰後經濟轉型與生活轉變', icon: '🏭',
          path: '單元2_戰後經濟轉型與生活轉變/', status: 'ready',
          sections: ['第1課 政府如何穩定戰後的社會發展？', '第2課 公共建設為何會改變生活型態？', '第3課 臺灣為什麼能成為世界的科技島？']
        },
        { id: 'soc6a-u3', no: 3, title: '迎向科技發展新挑戰', icon: '🤖', path: '單元3_迎向科技發展新挑戰/', status: 'soon', sections: [] },
        { id: 'soc6a-u4', no: 4, title: '生活中的規範與運作', icon: '⚖️', path: '單元4_生活中的規範與運作/', status: 'soon', sections: [] }
      ]
    }
  ]
};
