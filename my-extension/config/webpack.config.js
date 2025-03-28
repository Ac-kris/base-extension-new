const { VueLoaderPlugin } = require("vue-loader");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ESBuildMinifyPlugin } = require("esbuild-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WebpackBar = require("webpackbar");
const {
    BitableAppWebpackPlugin,
    opdevMiddleware,
} = require("@lark-opdev/block-bitable-webpack-utils");

const AutoImport = require("unplugin-auto-import/webpack");
const Components = require("unplugin-vue-components/webpack");
const { ElementPlusResolver } = require("unplugin-vue-components/resolvers");

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

const config = {
    entry: "./src/main.js",
    devtool: isProduction ? false : "inline-source-map",
    mode: isDevelopment ? "development" : "production",
    stats: "errors-only",
    output: {
        path: path.resolve(__dirname, "../dist"),
        clean: true,
        publicPath: isDevelopment ? "/block/" : "./",
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                use: "vue-loader",
            },
            {
                test: /\.js$/,
                include: [/node_modules\/@lark-open/],
                use: ["source-map-loader"],
                enforce: "pre",
            },
            {
                test: /\.css$/,
                use: [isDevelopment ? "style-loader" : MiniCssExtractPlugin.loader, "css-loader"],
            },
            {
                test: /\.(png|jpg|jpeg|gif|ico|svg)$/,
                type: "asset/resource",
                generator: {
                    filename: "assets/[name][ext][query]",
                },
            },
        ],
    },
    plugins: [
        ...(isDevelopment ? [new WebpackBar()] : [new MiniCssExtractPlugin()]),

        new BitableAppWebpackPlugin({
            // open: true, // 控制是否自动打开多维表格
        }),

        new HtmlWebpackPlugin({
            filename: "index.html",
            template: "./public/index.html",
            publicPath: isDevelopment ? "/block/" : "./",
        }),

        new VueLoaderPlugin(),

        AutoImport({
            resolvers: [ElementPlusResolver()],
            dts: false,
        }),
        Components({
            resolvers: [ElementPlusResolver()],
            dts: false,
        }),
    ],
    optimization: {
        minimize: isProduction,
        minimizer: [new ESBuildMinifyPlugin({ target: "es2015", css: true })],
        moduleIds: "deterministic",
        runtimeChunk: true,
        splitChunks: {
            chunks: "all",
            cacheGroups: {
                vendor: {
                    name: "vendor",
                    test: /[\\/]node_modules[\\/]/,
                    chunks: "all",
                },
            },
        },
    },
    devServer: isProduction
        ? undefined
        : {
              hot: true,
              client: {
                  logging: "error",
              },
              setupMiddlewares: (middlewares, devServer) => {
                  if (!devServer || !devServer.app) {
                      throw new Error("webpack-dev-server is not defined");
                  }
                  middlewares.push(opdevMiddleware(devServer));
                  return middlewares;
              },
          },
    cache: {
        type: "filesystem",
        buildDependencies: {
            config: [__filename],
        },
    },
};

module.exports = config;
