/* 数据表。数值尽量照录屏里能看到的填,看不到的按同样风格补(见 README 的差异清单)。 */
(function () {
  'use strict';
  const D = NL.data;

  // 主页地图上的三块建筑牌子(地图原图像素坐标)
  D.buildings = [
    { id: 'museum', name: '运动博物馆', box: [1090, 930, 1390, 1175] },
    { id: 'core', name: '圣物核心', box: [1225, 1270, 1480, 1510] },
    { id: 'hanshin', name: '阪神公司', box: [1870, 1205, 2120, 1450] },
  ];
  D.map = { w: 3773, h: 2609, start: [-475, -253] };

  D.items = {};
})();
