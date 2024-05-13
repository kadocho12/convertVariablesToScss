/// <reference types="@figma/plugin-typings" />

// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
// figma.showUI(__html__);

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
// figma.ui.onmessage = msg => {
//   // One way of distinguishing between different types of messages sent from
//   // your HTML page is to use an object with a "type" property like this.
//   if (msg.type === 'create-rectangles') {
//     const nodes: SceneNode[] = [];
//     for (let i = 0; i < msg.count; i++) {
//       const rect = figma.createRectangle();
//       rect.x = i * 150;
//       rect.fills = [{type: 'SOLID', color: {r: 1, g: 0.5, b: 0}}];
//       figma.currentPage.appendChild(rect);
//       nodes.push(rect);
//     }
//     figma.currentPage.selection = nodes;
//     figma.viewport.scrollAndZoomIntoView(nodes);
//   }

//   // Make sure to close the plugin when you're done. Otherwise the plugin will
//   // keep running, which shows the cancel button at the bottom of the screen.
//   figma.closePlugin();
// };

// このプラグインは登録されたStylesの色情報を取得し、コンソールに表示します。

figma.showUI(__html__);

function rgbToHex(rgb) {
  const r = Math.round(rgb.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(rgb.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(rgb.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function convertToObject(msg) {
  // 改行で文字列を分割
  const lines = msg.value.trim().split('\n');
  // オブジェクトを初期化
  const outputObject = {};
  // 各行についてループ
  lines.forEach(line => {
      // 行をコロンで分割して変数名と値を取得
      const [variable, value] = line.trim().split(':');
      // 変数名の先頭の$を取り除いて正規化
      const propertyName = variable.trim().replace(/^\$/, '');
      // 値を正規化
      const propertyValue = value.trim().replace(';', '');
      // オブジェクトにプロパティと値を追加
      outputObject[propertyName] = propertyValue;
  });
  return outputObject;
}

figma.ui.onmessage = async (msg: any) => {

  if (msg.type === 'get-colors') {
    // ユーザーが入力したscss形式の値をオブジェクトに変換する
    const InputObject = convertToObject(msg);
    console.log(InputObject);

    const currentPage = figma.currentPage;
    const targetFrame = currentPage.findOne(node => node.type === "FRAME" && node.name === "subpageVariables");

    function findNodesWithFills(node:any) {
      let nodesWithFills:any = [];
      if (node.fills && node.fills.some(fill => fill.type === "SOLID")) {
        nodesWithFills.push(node);
      }
      if ("children" in node) {
        node.children.forEach(child => {
          nodesWithFills = nodesWithFills.concat(findNodesWithFills(child));
        });
      }
      return nodesWithFills;
    }

    const nodesWithFills = findNodesWithFills(targetFrame);
    const variableColors:any = new Set();
    nodesWithFills.forEach(node => {
      node.fills.forEach(fill => {
        if(fill.boundVariables.color) {
          if (fill.type === "SOLID" && fill.boundVariables.color.type === "VARIABLE_ALIAS") {
            variableColors.add(fill.boundVariables.color);
          }
        }
      });
    });

    for (var value of variableColors) {
      console.log(value);
    }

    const result = figma.variables.getLocalVariables().filter(item => {
      return [...variableColors].some(b => b.id === item.id);
    });
    // result.forEach(item => {
    //   // console.log('item', item);
    //   // console.log(item.name);
    //   // console.log(rgbToHex(item.valuesByMode["14:0"]));
    //   // const testObj = {name: 'hogehoge', value: 'fugafuga'}
    //   const newObj = {
    //     [item.name]: rgbToHex(item.valuesByMode["14:0"])
    //   };
    // })
    const newObj = result.map(item => {
      return {[item.name]: rgbToHex(item.valuesByMode["14:0"])}
    })
    const mergedObj = newObj.reduce((acc, curr) => ({...acc, ...curr}), {});
    // console.log('mergedObj',mergedObj);


    const lastObj = {};
    for (let key in InputObject) {
      if (mergedObj.hasOwnProperty(key)) {
        lastObj[key] = mergedObj[key];
      } else {
        lastObj[key] = InputObject[key];
      }
    }
    console.log(lastObj);

    // オブジェクトをSCSS形式の文字列に変換する関数
    function objectToSCSS(obj) {
      let scssString = '';
      for (const key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) {
          scssString += `$${key}: ${obj[key]};\n`;
        }
      }
      return scssString;
    }
    // SCSS形式の文字列に変換
    const scssString = objectToSCSS(lastObj);
    // 変換された文字列を出力
    console.log('scssString',scssString);

    // UIを表示するコード。HTMLは直接文字列で指定するか、外部ファイルから読み込みます。
    figma.showUI(__html__, { width: 400, height: 400 });
    // UIに対してメッセージを送信します。
    figma.ui.postMessage({ type: 'display-message', message: scssString });
  }
};

// const AAA = {
//   'original-section-title-main-color': '#ff551f',
//   'original-section-border-main-color': '#0235b8',
//   'original-section-font-main-color': '#333333'
// }
// const BBB = {
//   'original-section-title-main-color': '#111111',
//   'original-section-border-main-color': '#222222'
// }