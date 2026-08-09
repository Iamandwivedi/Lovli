// Swipe-navigable tabs for expo-router.
//
// expo-router's <Tabs> is built on bottom-tabs, which has no pager and cannot
// swipe. Material top tabs is the navigator that does, so we wrap it with
// withLayoutContext to keep expo-router's file-based routing — the screens and
// their URLs are unchanged, only the container swaps.
//
// "Top" is just the navigator's name: tabBarPosition and a custom tabBar put
// our own glass bar at the bottom, exactly where it was.
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import type {
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
} from "@react-navigation/material-top-tabs";
import type { ParamListBase, TabNavigationState } from "@react-navigation/native";
import { withLayoutContext } from "expo-router";

const { Navigator } = createMaterialTopTabNavigator();

export const SwipeTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);
