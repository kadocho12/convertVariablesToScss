/// <reference types="@figma/plugin-typings" />

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

    const newObj = result.map(item => {
      return {[item.name]: rgbToHex(item.valuesByMode["14:0"])}
    })
    const mergedObj = newObj.reduce((acc, curr) => ({...acc, ...curr}), {});
    const lastObj = {};
    for (let key in InputObject) {
      if (mergedObj.hasOwnProperty(key)) {
        lastObj[key] = mergedObj[key];
      } else {
        lastObj[key] = InputObject[key];
      }
    }

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